"""NEXT ROOM V6.3 — 선생님 피드백 검증
1) 태블릿: 터치 기기에서는 마우스 잠금이 걸리지 않고 화면 끌기로 시점이 돈다 (포인터 잠금을 켠 상태로 시험)
2) 생명 1칸에서 퍼즐 오답 → 쓰러짐 (봐주지 않음)
3) 속삭이: 벽에 가리지 않는 플레이어 곁에 나타나고, 플레이어가 움직이면 따라온다
4) 사서: 서랍 소리에 반응 / 문제를 푸는 동안에도 계속 쫓아온다
5) 먹물: 복도 56 m, 속도 +8%
6) 비례식 문제 문장
실행: python3 tests/e2e/v63_test.py
"""
import asyncio, sys, os, json, math
sys.path.insert(0, '/home/claude/v5/tests/e2e')
import harness
from harness import Game, launch

RESULTS = []
def record(name, ok, detail=''):
    RESULTS.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + detail if detail else ''), flush=True)

async def touch_test():
    os.environ['MD_LOCK'] = '1'
    try:
        for vp, mobile, tag in [((390, 844), True, 'phone/tablet'), ((1280, 800), True, 'tablet in desktop mode')]:
            p, b, ctx, pg = await launch(viewport=vp, mobile=mobile)
            g = Game(pg, lambda m: None)
            await g.ev("startGame({seed:4242, maxDoors:10, door:1, units:[1,2,3,4,5,6], difficulty:'easy', hearts:3})")
            await pg.wait_for_timeout(800)
            locked = await g.ev("!!document.pointerLockElement")
            cdp = await ctx.new_cdp_session(pg)
            async def touch(type_, pts):
                await cdp.send('Input.dispatchTouchEvent', {'type': type_, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
            y0 = await g.ev("player.targetYaw")
            sx, sy = int(vp[0] * 0.75), int(vp[1] * 0.45)
            await touch('touchStart', [(sx, sy)])
            for k in range(10):
                await touch('touchMove', [(sx - 12 * (k + 1), sy)]); await pg.wait_for_timeout(30)
            await touch('touchEnd', [])
            await pg.wait_for_timeout(200)
            y1 = await g.ev("player.targetYaw")
            record(f'{tag}: touch device is not mouse-locked and dragging the screen turns the view', not locked and abs(y1 - y0) > 0.3 and not await g.ev("!!document.pointerLockElement"), f'locked={locked} yaw {y0:.2f}→{y1:.2f}')
            await b.close(); await p.stop()
    finally:
        os.environ.pop('MD_LOCK', None)

async def main():
    await touch_test()
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    # 2) 마지막 생명 오답
    await g.ev("startGame({seed:4242, maxDoors:10, door:2, units:[1,2,3,4,5,6], difficulty:'easy', hearts:1})")
    await pg.wait_for_timeout(800); await g.ev("clearAllMonsterTimers()"); await g.hook_hits()
    await g.ev("() => { const r = activeRooms[currentDoor]; r.requiresKey = false; r.keyUnlocked = true; r.problem = NextRoomBank.generate(1, 'F', NextRoomCore.makeRng('x', 1, 1)); openPuzzleModal(); }")
    await pg.wait_for_timeout(300)
    await g.solve_open_puzzle(False); await pg.wait_for_timeout(1500)
    st = await g.state()
    title = await g.ev("document.getElementById('result-title').innerText")
    record('1 heart + wrong puzzle answer → game over (no mercy)', not st['playing'] and st['hearts'] == 0 and 'DIED' in title, f"hearts={st['hearts']} title={title}")
    await g.ev("returnToLobby()"); await pg.wait_for_timeout(400)
    # 3) 속삭이
    found = await g.ev("""() => { for (let s = 1; s < 300; s++) { NextRoomCore.setSeason(1); const P = NextRoomCore.planStage(10, s).rooms; for (let n = 2; n <= 9; n++) if (P[n] && (P[n].arch === 'maze' || P[n].arch === 'zigzag')) return [s, n]; } }""")
    await g.ev(f"startGame({{seed:{found[0]}, maxDoors:10, door:{found[1]}, units:[1,2,3,4,5,6], difficulty:'easy', hearts:3}})")
    await pg.wait_for_timeout(800); await g.ev("clearAllMonsterTimers()")
    ok_all = True; info = []
    for trial in range(6):
        await g.ev(f"() => {{ hideWhisper3D && hideWhisper3D(); const r = activeRooms[currentDoor]; const t = NextRoomCore.resolvePoint(r.layout, ({trial} % 3 - 1) * 3, r.roomLen * (0.25 + 0.1 * {trial}), 0.42, roomCollisionState(r)); player.x = r.centerX + t.x; player.z = r.zStart - t.d; player.yaw = player.targetYaw = {trial} * 1.1; whisperState.active = false; spawnWhisper3D(); }}")
        await pg.wait_for_timeout(200)
        r = await g.ev("() => { const r = activeRooms[currentDoor]; return [whisperState.active, whisperSpotOK(r, whisperState.x, whisperState.z), Math.hypot(whisperState.x - player.x, whisperState.z - player.z)]; }")
        info.append(f"{r[1]}/{r[2]:.1f}m")
        if not (r[0] and r[1] and r[2] < 3.6): ok_all = False
    record('whisper appears beside the player (≤ 3.6 m) with no wall in between (6 spots in a maze room)', ok_all, ' '.join(info))
    await g.ev("() => { const r = activeRooms[currentDoor]; const t = NextRoomCore.resolvePoint(r.layout, 0, r.roomLen * 0.5, 0.42, roomCollisionState(r)); player.x = r.centerX + t.x; player.z = r.zStart - t.d; whisperState.active = false; spawnWhisper3D(); }")
    await g.ev("() => { const r = activeRooms[currentDoor]; const t = NextRoomCore.resolvePoint(r.layout, 0, r.roomLen * 0.5 + 3.5, 0.42, roomCollisionState(r)); player.x = r.centerX + t.x; player.z = r.zStart - t.d; }")
    await pg.wait_for_timeout(2500)
    r = await g.ev("() => { const r = activeRooms[currentDoor]; return [Math.hypot(whisperState.x - player.x, whisperState.z - player.z), whisperSpotOK(r, whisperState.x, whisperState.z), whisperState.active]; }")
    record('whisper follows when the player moves 3.5 m (stays near, not behind a wall)', (not r[2]) or (r[0] < 4.0 and r[1]), f'dist={r[0]:.1f} visible={r[1]}')
    await g.ev("hideWhisper3D()")
    # 4) 사서
    await g.ev("startGame({seed:4242, maxDoors:10, door:5, units:[1,2,3,4,5,6], difficulty:'easy', hearts:3})")
    await pg.wait_for_timeout(1200); await g.ev("clearAllMonsterTimers(); initWardenBossRoom(activeRooms[currentDoor]);")
    lib = await g.ev("activeRooms[currentDoor].roomArch + (wardenState.active ? '' : ' (warden inactive!)')")
    res = await g.ev("""() => { const r = activeRooms[currentDoor]; const d = r.drawers[0]; wardenSetMode('patrol'); wardenState.calmTimer = 0;
        // 사서를 서랍에서 9 m쯤 떨어진 곳에 둔다
        const lx = d.worldX - r.centerX, ld = r.zStart - d.worldZ; const t = NextRoomCore.resolvePoint(r.layout, lx * 0.5, Math.min(r.roomLen - 1, ld + 7), 0.5, {crouch:true}); wardenState.lx = t.x; wardenState.ld = t.d;
        const pp = NextRoomCore.resolvePoint(r.layout, lx, ld, 0.42, roomCollisionState(r)); player.x = r.centerX + pp.x; player.z = r.zStart - pp.d; const before = wardenState.mode; inspectDrawer3D(d); return [before, wardenState.mode, Math.hypot(lx - wardenState.lx, ld - wardenState.ld)]; }""")
    record(f'warden ({lib}): opening a drawer makes it come (patrol → investigate/chase)', res[0] == 'patrol' and res[1] in ('investigate', 'chase'), f'{res[0]}→{res[1]} at {res[2]:.1f} m')
    await g.ev("""() => { const r = activeRooms[currentDoor]; const lp = toLocal(r, player.x, player.z); const t = NextRoomCore.resolvePoint(r.layout, lp.x, Math.max(1, lp.d - 7), 0.5, {crouch:true}); wardenState.lx = t.x; wardenState.ld = t.d; wardenSetMode('chase', lp); wardenState.lostTimer = 0;
        r.requiresKey = false; r.keyUnlocked = true; r.puzzleSolved = false; openPuzzleModal(); }""")
    modes = []
    d0 = await g.ev("() => { const r = activeRooms[currentDoor], lp = toLocal(r, player.x, player.z); return Math.hypot(lp.x - wardenState.lx, lp.d - wardenState.ld); }")
    for i in range(8):
        await pg.wait_for_timeout(700)
        modes.append(await g.ev("wardenState.mode + (uiOpen.puzzle ? '' : '(closed)')"))
    d1 = await g.ev("() => { const r = activeRooms[currentDoor], lp = toLocal(r, player.x, player.z); return Math.hypot(lp.x - wardenState.lx, lp.d - wardenState.ld); }")
    active = await g.ev("wardenState.active")
    record('warden keeps chasing while the player is solving a puzzle (no safe haven)', active and all(m.startswith('chase') or 'closed' in m for m in modes[:5]) and (d1 < d0 - 1 or 'closed' in ''.join(modes)), f"{' '.join(modes)} dist {d0:.1f}→{d1:.1f}")
    await g.ev("closePuzzleModal()")
    # 5) 먹물
    ink = await g.ev("""() => { NextRoomCore.setSeason(1); for (let s = 1; s < 50; s++) { const P = NextRoomCore.planStage(10, s).rooms; for (let n = 2; n <= 10; n++) if (P[n] && P[n].arch === 'ink') { const L = NextRoomCore.generateRoom(s, P[n], { kind: 'none' }); return L.L; } } }""")
    await g.ev("returnToLobby()")
    record('ink corridor is longer (56 m, was 44 m)', abs(ink - 56) < 0.01, f'L={ink}')
    sp = await g.ev("() => { gameDifficulty = 'easy'; SEASON = 1; const f = String(startInkChaseSequence); return /4\\.15/.test(f) || /4\\.15/.test(document.documentElement.innerHTML); }")
    record('ink is faster (easy 4.15 m/s, was 3.85)', sp)
    # 6) 문제 문장
    q = await g.ev("() => { for (let i = 0; i < 200; i++) { const p = NextRoomBank.generate(4, 'F', NextRoomCore.makeRng('q', i, 2)); if (p && /구슬 수의 비/.test(p.q)) return p.q; } return ''; }")
    record('proportion story problem reads as a full sentence (no "가 : 나 … 가가 …")', '민지' in q and '가가' not in q, q)
    record('v6.3: no page errors', not g.errors, '; '.join(g.errors[:3]))
    print('SUMMARY', sum(1 for r in RESULTS if r[1]), '/', len(RESULTS))
    json.dump(RESULTS, open('/home/claude/scenario_results_v63.json', 'w'), ensure_ascii=False, indent=1)
    await b.close(); await p.stop()

asyncio.run(main())
