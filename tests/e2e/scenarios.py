"""NEXT ROOM V5 — 개별 시나리오 브라우저 테스트 (실제 조작).
1) 체크포인트: DOOR 5까지 실제 플레이 → 저장 확인 → 새로고침 → 이어하기 → 방 구조·문제·이전 방 문 상태 비교
2) 손상/구버전 저장 데이터: 무한 로딩 없이 로비로, 정리 안내
3) 사서: 들킴 → 옷장 → 책 꽂기 오답/정답 → 순찰 복귀·안전 시간
4) 모바일 터치: 조이스틱 이동, 퍼즐 창 열림 동안 이동/시점 잠김, 닫은 뒤 정상 복귀, 터치 버튼 숨김
"""
import asyncio, sys, json, math, time
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch, BASE
from agent import play_room, hide_until_safe

RESULTS = []
def record(name, ok, detail=''):
    RESULTS.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + detail if detail else ''), flush=True)

SNAP = """() => { const out = {door: currentDoor}; const nx = ensureLogical(Math.min(maxDoors, currentDoor + 1)); out.nextLogical = { arch: nx.plan.arch, problem: nx.problem && nx.problem.sig, W: nx.layout.W, L: nx.layout.L, exitX: nx.layout.exitX, cx: nx.centerX }; [currentDoor-1, currentDoor, currentDoor+1].forEach(n => { const r = activeRooms[n]; if (!r) return;
  out[n] = { arch: r.roomArch, W: r.roomW, L: r.roomLen, cx: +r.centerX.toFixed(3), z0: +r.zStart.toFixed(3), exitX: r.layout.exitX,
    rects: r.layout.rects.length, closets: r.layout.closets.map(c=>[c.x,c.d]), drawers: r.layout.drawers.map(c=>[c.x,c.d,c.loot]),
    problem: r.problem ? r.problem.sig : null, solved: r.puzzleSolved, unlocked: r.unlocked, doorOpen: r.doors.some(d=>d.isOpen), visible: r.group.visible }; });
  return out; }"""

async def checkpoint_test():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    await g.start(doors=10, diff='easy', units=(3,), seed=777)
    while (await g.state())['door'] < 5:
        st = await g.state()
        if not st['playing']: break
        if not await play_room(g, g.log): break
    st = await g.state()
    record('checkpoint: reached DOOR 5 by real play (unit 3 only)', st['door'] == 5, f"door={st['door']} hearts={st['hearts']}")
    saved = await g.ev("localStorage.getItem('mathDoorsV5_checkpoint')")
    record('checkpoint: auto-saved at DOOR 5', bool(saved) and json.loads(saved)['door'] == 5, (saved or '')[:120])
    before = await g.ev(SNAP)
    hearts_before = st['hearts']
    await pg.reload()
    await pg.wait_for_function("window.NextRoomDebug && typeof activeRooms !== 'undefined'", timeout=20000)
    await pg.evaluate('window.__dtCap = 0.34')
    await pg.wait_for_timeout(800)
    vis = await g.ev("!document.getElementById('save-panel').classList.contains('hidden')")
    record('checkpoint: lobby shows continue panel after reload', vis)
    await pg.click('#continue-btn')
    await pg.wait_for_timeout(1200)
    after = await g.ev(SNAP)
    st2 = await g.state()
    same = all(json.dumps({k: v for k, v in before[str(n)].items() if k not in ('visible',)}, sort_keys=True) == json.dumps({k: v for k, v in after[str(n)].items() if k not in ('visible',)}, sort_keys=True) for n in (5,) )
    record('checkpoint: DOOR 5 room layout + problem identical after reload', same, json.dumps(after.get('5'))[:200])
    prev_ok = before['4']['arch'] == after['4']['arch'] and before['4']['exitX'] == after['4']['exitX'] and after['4']['doorOpen'] and after['4']['unlocked'] and after['4']['cx'] == before['4']['cx'] and after['4']['problem'] == before['4']['problem']
    record('checkpoint: previous room (DOOR 4) rebuilt identical with exit door open', prev_ok, json.dumps(after['4'])[:200])
    nxt_ok = before['nextLogical'] == after['nextLogical']
    record('checkpoint: next room (DOOR 6) plan/layout/problem identical', nxt_ok, json.dumps(after['nextLogical'], ensure_ascii=False))
    record('checkpoint: hearts restored', st2['hearts'] == hearts_before, f"{hearts_before}→{st2['hearts']}")
    # continue playing a room after restore to prove it is playable
    ok = await play_room(g, g.log)
    record('checkpoint: restored game continues (DOOR 5 cleared)', ok and (await g.state())['door'] == 6)
    # corrupt save
    await g.ev("localStorage.setItem('mathDoorsV5_checkpoint', '{broken json')")
    t0 = time.time(); await pg.reload()
    await pg.wait_for_function("window.NextRoomDebug && typeof activeRooms !== 'undefined'", timeout=20000)
    await pg.wait_for_timeout(600)
    note = await g.ev("document.getElementById('save-note').innerText")
    panel = await g.ev("!document.getElementById('save-panel').classList.contains('hidden')")
    lobby = await g.ev("!document.getElementById('lobby-screen').classList.contains('hidden')")
    record('save: corrupt data → lobby loads, no continue, note shown', lobby and not panel and '정리' in note, f'{time.time()-t0:.1f}s note={note}')
    await g.ev("localStorage.setItem('mathDoorsV5_checkpoint', JSON.stringify({v:4, door:6, seed:1}))")
    await pg.reload()
    await pg.wait_for_function("window.NextRoomDebug && typeof activeRooms !== 'undefined'", timeout=20000)
    await pg.wait_for_timeout(600)
    left = await g.ev("localStorage.getItem('mathDoorsV5_checkpoint')")
    record('save: old-version data removed, game still starts', left is None)
    # valid-looking but mismatched history (e.g. saved by different code) → refused cleanly
    await g.ev("localStorage.setItem('mathDoorsV5_checkpoint', JSON.stringify({v:5, seed:777, maxDoors:10, door:5, units:[3], difficulty:'easy', hearts:3, history:['x','y','z','w']}))")
    await pg.reload()
    await pg.wait_for_function("window.NextRoomDebug && typeof activeRooms !== 'undefined'", timeout=20000)
    await pg.evaluate('window.__dtCap = 0.34')
    await pg.wait_for_timeout(500)
    await pg.click('#continue-btn')
    await pg.wait_for_timeout(1200)
    lobby = await g.ev("!document.getElementById('lobby-screen').classList.contains('hidden')")
    record('save: mismatched history refused → back to lobby (no hang)', lobby and await g.ev("localStorage.getItem('mathDoorsV5_checkpoint')") is None)
    record('checkpoint: no page errors', not g.errors, '; '.join(g.errors[:3]))
    await b.close(); await p.stop()

async def warden_test():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    # find a seed whose door 5 is a library (10-door mode: always) — play to it
    await g.start(doors=10, diff='easy', units=(4, 5), seed=31337)   # V6: 시즌1 호텔 맵 기준 시나리오
    while (await g.state())['door'] < 5:
        if not await play_room(g, g.log): break
    st = await g.state()
    record('warden: reached library by real play', st['room']['arch'] == 'library' and st['warden']['active'], f"door={st['door']}")
    # crouch-walk straight at the warden: right next to it (or inside its lantern cone) the player is detected even when crouching
    await g.set_crouch(True)
    detected = False
    for _ in range(200):
        st = await g.state()
        f = st['warden']
        if f['mode'] == 'chase': detected = True; break
        await g.walk_to(f['x'], f['d'], tol=1.0, timeout=0.6, crouch=True)
    record('warden: crouching close to the warden is NOT always safe (detected)', detected, f"mode={st['warden']['mode']}")
    # run to nearest closet and hide while chased
    await g.set_crouch(False)
    t = await g.targets(); p0 = st['player']
    c = min(t['closets'], key=lambda c: math.hypot(c['x'] - p0['x'], c['d'] - p0['d']))
    await g.walk_to(c['x'], c['d'], tol=0.9, timeout=12, crouch=False)
    await g.key('KeyE')
    hb_open = False
    for _ in range(120):
        st = await g.state()
        if st['ui']['shelf']: hb_open = True; break
        if st['closet'] == 'NONE' and st['warden']['mode'] != 'hunt':
            await g.walk_to(c['x'], c['d'], tol=0.9, timeout=6, crouch=False); await g.key('KeyE')
        await pg.wait_for_timeout(150)
    record('warden: hiding while chased starts the shelf quiz', hb_open, f"closet={st['closet']} mode={st['warden']['mode']}")
    if hb_open:
        await g.ev("() => { hearts = 3; updateHUD(); }")   # 앞방에서 다친 상태와 무관하게 책 꽂기 규칙만 확인
        h0 = (await g.state())['hearts']
        await g.answer_choice_modal('shelf', False)
        await pg.wait_for_timeout(600)
        st = await g.state()
        record('warden: wrong shelf answer → warden stays (no give-up)', st['ui']['shelf'] and st['warden']['hunt'])
        await g.answer_choice_modal('shelf', False)
        await pg.wait_for_timeout(1700)
        st = await g.state()
        record('warden: 2nd wrong answer → closet shaken (−1 heart; V6.3: lethal at the last heart), still hunting', (st['ui']['shelf'] and st['hearts'] == h0 - 1) or (h0 == 1 and not st['playing']), f"hearts {h0}→{st['hearts']}")
        await g.answer_choice_modal('shelf', True)
        await pg.wait_for_timeout(500)
        st = await g.state()
        record('warden: correct answer → shelf quiz closes, warden returns to patrol (calm safe time)', not st['ui']['shelf'] and not st['warden']['hunt'] and st['warden']['mode'] == 'calm', f"mode={st['warden']['mode']}")
        # warden moves away / no immediate attack during safe time
        h1 = st['hearts']
        await pg.wait_for_timeout(1500)
        await g.key('KeyE'); await pg.wait_for_timeout(1200)
        st = await g.state()
        record('warden: can leave closet after correct answer, not hit during safe time', st['closet'] == 'NONE' and st['hearts'] == h1)
    # warden never inside a shelf: sample its positions
    bad = await g.ev("""() => new Promise(res => { let bad = 0, n = 0; const t0 = performance.now(); (function f(){ const r = activeRooms[currentDoor]; if (r && wardenState.active) { n++; if (NextRoomCore.pointBlocked(r.layout, wardenState.lx, wardenState.ld, 0.45, {crouch:true, exitOpen:false})) bad++; } if (performance.now() - t0 < 6000) requestAnimationFrame(f); else res({bad, n}); })(); })""")
    record('warden: never overlaps shelves/walls while moving (sampled 6 s)', bad['bad'] == 0 and bad['n'] > 10, str(bad))
    record('warden: no page errors', not g.errors, '; '.join(g.errors[:3]))
    await b.close(); await p.stop()

async def mobile_test():
    p, b, ctx, pg = await launch(viewport=(420, 760), mobile=True)
    g = Game(pg, lambda m: print(m, flush=True))
    await g.ev("() => { window.__forceSeed = 99; selectStageCount(10); }")
    await pg.tap('text=새 게임 시작')
    await pg.wait_for_timeout(800)
    box = await pg.locator('#joystick-zone').bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    d0 = (await g.state())['player']['d']
    cdp = await ctx.new_cdp_session(pg)
    async def touch(type_, pts):
        await cdp.send('Input.dispatchTouchEvent', {'type': type_, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
    await touch('touchStart', [(cx, cy)])
    for k in range(10):
        await touch('touchMove', [(cx, cy - 4 * (k + 1))]); await pg.wait_for_timeout(30)
    await pg.wait_for_timeout(1500)
    d1 = (await g.state())['player']['d']
    record('mobile: joystick drag moves forward', d1 > d0 + 2.0, f'{d0:.2f}→{d1:.2f}')
    # second finger on right side rotates view while joystick held (separate pointers)
    y0 = (await g.state())['player']['yaw']
    await touch('touchMove', [(cx, cy - 40), (330, 300)])
    for k in range(8):
        await touch('touchMove', [(cx, cy - 40), (330 - 10 * (k + 1), 300)]); await pg.wait_for_timeout(30)
    y1 = (await g.state())['player']['yaw']
    record('mobile: right-side drag rotates view while joystick is held', abs(y1 - y0) > 0.2, f'yaw {y0:.2f}→{y1:.2f}')
    await touch('touchEnd', [])
    await pg.wait_for_timeout(300)
    # open puzzle (hint button) while holding joystick → no movement/rotation, controls hidden
    await touch('touchStart', [(cx, cy)]); await touch('touchMove', [(cx, cy - 40)])
    await g.ev('openPuzzleModal()')
    await pg.wait_for_timeout(300)
    s1 = await g.state()
    await pg.wait_for_timeout(1200)
    s2 = await g.state()
    hidden = await g.ev("getComputedStyle(document.getElementById('joystick-zone')).visibility === 'hidden' && getComputedStyle(document.getElementById('turn-controls')).visibility === 'hidden'")
    record('mobile: puzzle open → player does not move', abs(s2['player']['d'] - s1['player']['d']) < 0.02 and abs(s2['player']['yaw'] - s1['player']['yaw']) < 0.01)
    record('mobile: puzzle open → joystick/turn buttons hidden (no overlap with keypad)', hidden)
    # keypad must be fully on screen
    kb = await pg.locator('#numeric-keypad-section').bounding_box() if await g.ev("!document.getElementById('numeric-keypad-section').classList.contains('hidden')") else None
    sub = await pg.locator('#puzzle-modal button:has-text("닫기")').bounding_box()
    record('mobile: puzzle close button on screen', sub is not None and sub['y'] >= 0 and sub['y'] + sub['height'] <= 760)
    await touch('touchEnd', [])
    await pg.tap('#puzzle-modal button:has-text("닫기")')
    await pg.wait_for_timeout(300)
    vis = await g.ev("getComputedStyle(document.getElementById('joystick-zone')).visibility")
    # 벽에 붙어 있을 수 있으므로 조이스틱을 아래로(뒤로) 당겨 이동 확인
    await touch('touchStart', [(cx, cy)])
    for k in range(8):
        await touch('touchMove', [(cx, cy + 5 * (k + 1))]); await pg.wait_for_timeout(30)
    p3 = (await g.state())['player']; await pg.wait_for_timeout(1000); p4 = (await g.state())['player']
    await touch('touchEnd', [])
    moved = math.hypot(p4['x'] - p3['x'], p4['d'] - p3['d'])
    record('mobile: after closing puzzle, controls visible and joystick works again', vis == 'visible' and moved > 1.0, f'moved {moved:.2f} m')
    record('mobile: no page errors', not g.errors, '; '.join(g.errors[:3]))
    await pg.screenshot(path='/home/claude/mobile.png')
    await b.close(); await p.stop()

async def gale_breath_test():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    # 돌풍이 있는 일반 방(미로·암실 제외)을 계획표에서 찾는다
    seed, dn = await g.ev("() => { for (let seed = 1; seed < 500; seed++) { const P = NextRoomCore.planStage(20, seed).rooms; for (let n = 3; n <= 19; n++) { const r = P[n]; if (r && r.events.gale && !r.events.whisper && !['maze', 'darkRoom', 'keySearch'].includes(r.arch)) return [seed, n]; } } }")
    await g.ev(f"startGame({{seed:{seed}, maxDoors:20, door:{dn}, units:[1,2,3,4,5,6], difficulty:'easy', hearts:3}})")
    await pg.wait_for_timeout(300)
    await g.hook_hits()
    st = await g.state()
    record(f'gale: plan schedules gale in DOOR {dn} (seed {seed})', st['room']['events']['gale'])
    # 예약된 돌풍을 잠시 보류 → 옷장 근처(3 m)까지 걸어간 뒤 같은 돌풍을 발생시킨다
    # (테스트 환경은 화면이 초당 3~5장이라 자동 조작이 꺾인 방을 실제 학생보다 훨씬 느리게 걷기 때문)
    await g.ev("() => { clearTimeout(galeSpawnTimerId); clearTimeout(whisperSpawnTimerId); }")
    t = await g.targets(); pl = (await g.state())['player']
    c = min(t['closets'], key=lambda c: math.hypot(c['x'] - pl['x'], c['d'] - pl['d']))
    await g.walk_to(c['x'], c['d'], tol=1.6, timeout=60)   # 옷장 바로 앞
    await g.ev("triggerGaleEvent()")
    for _ in range(200):
        st = await g.state()
        if st['gale']['warning']: break
        await pg.wait_for_timeout(100)
    # 경고가 들리면 옷장으로 숨는다 → V6.2: 걸쇠 문제 없이 돌풍이 그대로 지나가야 한다
    r = await g.walk_to(c['x'], c['d'], tol=0.9, timeout=25)
    await g.key('KeyE')
    h0 = (await g.state())['hearts']
    em = False; phases = set()
    for _ in range(300):
        st = await g.state(); phases.add(st['gale']['phase'])
        if st['ui']['emergency']: em = True
        if not st['gale']['active'] and not st['gale']['warning'] and 'SWEEPING' in phases: break
        await pg.wait_for_timeout(100)
    st = await g.state()
    record('gale: hidden in a closet → NO latch quiz while it passes (V6.2)', not em and st['closet'] == 'HIDDEN', f"walk={r} closet={st['closet']} phases={sorted(phases)}")
    record('gale: sweeps past the hidden player with no damage', 'SWEEPING' in phases and st['hearts'] == h0, f"hearts {h0}→{st['hearts']}")
    await g.key('KeyE'); await pg.wait_for_timeout(1200)
    st = await g.state()
    record('gale: player can leave the closet afterwards in the SAME room', st['door'] == dn and st['closet'] == 'NONE', str(st['player']))
    # 숨 게이지: 위험이 없는데 옷장에 오래 있으면 숨이 차서 스스로 나온다 (피해 없음)
    await pg.wait_for_timeout(5000)
    st = await g.state(); pl = st['player']
    c = min(t['closets'], key=lambda c: math.hypot(c['x'] - pl['x'], c['d'] - pl['d']))
    for attempt in range(3):   # 돌풍이 막 지나간 직후엔 옷장이 잠깐 닫혀 있을 수 있어 몇 번 다시 시도
        await g.walk_to(c['x'], c['d'], tol=0.9, timeout=12)
        prox_txt = await g.ev("document.getElementById('proximity-btn').classList.contains('hidden') ? '(none)' : document.getElementById('proximity-text').innerText")
        await g.key('KeyE'); await pg.wait_for_timeout(1500)
        st = await g.state()
        hidden_at = st['closet']
        if hidden_at == 'HIDDEN': break
        await pg.wait_for_timeout(1500)
    g.log(f'    breath try: prompt={prox_txt} closet={hidden_at} player={st["player"]} closet_at={c}')
    h1 = st['hearts']; ejected = False; tsec = 0
    n_hits = len(await g.ev('window.__hits'))
    for i in range(300):
        st = await g.state()
        if st['closet'] == 'NONE': ejected = True; tsec = i * 0.1; break
        await pg.wait_for_timeout(100)
    hits = await g.ev('window.__hits')
    toast = await g.ev("document.getElementById('toast-text').innerText")
    record('breath: staying in a closet with no danger → breath runs out, player comes out', hidden_at == 'HIDDEN' and ejected and '숨이 차서' in toast, f'after ~{tsec:.0f}s, toast={toast}')
    record('breath: running out of breath does no damage', st['hearts'] == h1 and len(hits) == n_hits, f'hearts {h1}→{st["hearts"]}')
    record('gale/breath: no page errors', not g.errors, '; '.join(g.errors[:3]))
    await b.close(); await p.stop()

async def main(which):
    if 'gale' in which: await gale_breath_test()
    if 'mobile' in which: await mobile_test()
    if 'checkpoint' in which: await checkpoint_test()
    if 'warden' in which: await warden_test()
    print('SUMMARY', sum(1 for r in RESULTS if r[1]), '/', len(RESULTS))
    json.dump(RESULTS, open('/home/claude/scenario_results_%s.json' % '_'.join(which), 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1:] or ['mobile', 'checkpoint', 'warden']))
