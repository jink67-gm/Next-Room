"""NEXT ROOM V6.1 — 교사 피드백 검증
1) 단계 잠금: 처음엔 쉬움만 열림 → 쉬움 탈출 시 보통, 보통 탈출 시 도전이 열림 / ?teacher 는 모두 열림
2) 문제 푸는 곳 = 장치(패널) 한 곳: 문 앞(석문 옆 틈 포함)에서는 문제가 열리지 않고, 장치에서만 열림
3) 시즌 아이템은 장치에 끼움 (부족하면 문제가 안 열림) / 단서 쪽지 버튼으로 멀리서 문제를 열 수 없음
4) HTML 저장 버튼 없음
실행: python3 tests/e2e/v61_test.py
"""
import asyncio, sys, os, json, math
os.environ['MD_FRESH'] = '1'          # 단계 잠금 기록 없이 시작
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch, BASE

RESULTS = []
def record(name, ok, detail=''):
    RESULTS.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + detail if detail else ''), flush=True)

async def ui(g):
    return await g.ev("""() => ({ locked: ['easy','normal','challenge'].filter(d => document.getElementById('diff-btn-' + d).classList.contains('diff-locked')),
      diff: gameDifficulty, toast: document.getElementById('toast-text') ? document.getElementById('toast-text').innerText : '' })""")

FIND = """(want) => { for (let s = 1; s < 400; s++) { NextRoomCore.setSeason(want.season); const P = NextRoomCore.planStage(10, s).rooms;
  for (let n = 2; n <= 9; n++) { const r = P[n]; if (!r) continue;
    if (want.kind === 'monolith' && r.puzzleDevice === 'monolith') return [s, n];
    if (want.kind === 'key' && r.arch === 'keySearch') return [s, n]; } } return null; }"""

async def main():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    # ---------- 4) HTML 저장 버튼
    record('no "HTML 저장" button in the lobby', not await g.ev("[...document.querySelectorAll('button')].some(b => /HTML 저장/.test(b.innerText))"))
    # ---------- 1) 단계 잠금
    u = await ui(g)
    record('fresh browser: only 쉬움 is open (보통·도전 locked)', u['locked'] == ['normal', 'challenge'] and u['diff'] == 'easy', str(u))
    await g.ev("selectDifficulty('normal')"); await pg.wait_for_timeout(300)
    u = await ui(g)
    record('clicking locked 보통 keeps 쉬움 and explains how to open it', u['diff'] == 'easy' and '탈출하면' in u['toast'], u['toast'])
    await g.ev("() => { gameDifficulty = 'challenge'; }")      # 버튼을 우회해도 시작 불가
    await pg.click('text=새 게임 시작'); await pg.wait_for_timeout(500)
    st = await g.state()
    record('a locked difficulty cannot be started (even if forced)', not st['playing'], f"playing={st['playing']}")
    await g.ev("selectDifficulty('easy')")
    await g.start(doors=10, diff='easy', seed=4242)
    st = await g.state()
    record('쉬움 starts normally', st['playing'])
    await g.ev("finishGame(true)"); await pg.wait_for_timeout(500)
    desc = await g.ev("document.getElementById('result-desc').innerText")
    record('escaping 쉬움 shows "보통 단계가 열렸습니다"', '열렸습니다' in desc and '보통' in desc, desc[-60:])
    await g.ev("returnToLobby()"); await pg.wait_for_timeout(400)
    u = await ui(g)
    record('after 쉬움: 보통 open, 도전 still locked', u['locked'] == ['challenge'], str(u))
    await g.ev("selectDifficulty('normal')")
    await g.start(doors=10, diff='normal', seed=4242)
    await g.ev("finishGame(true)"); await pg.wait_for_timeout(400)
    await g.ev("returnToLobby()"); await pg.wait_for_timeout(400)
    u = await ui(g)
    record('after 보통: 도전 open too', u['locked'] == [], str(u))
    await g.ev("localStorage.removeItem('mathDoorsCleared')")
    await pg.goto(BASE.replace('index.html', 'index.html?teacher')); await pg.wait_for_function("window.NextRoomDebug && isPlaying === false")
    await pg.wait_for_timeout(500)
    u = await ui(g)
    record('?teacher opens every difficulty for the teacher', u['locked'] == [], str(u))
    await pg.goto(BASE); await pg.wait_for_function("window.NextRoomDebug && isPlaying === false")
    await g.ev("window.__unlockAll = true; window.__dtCap = 0.34")
    # ---------- 2) 석문 방: 문 앞에서는 문제가 열리지 않음
    found = None
    for s_ in range(1, 60):
        await g.ev(f"startGame({{seed:{s_}, maxDoors:10, door:1, units:[1,2,3,4,5,6], difficulty:'normal', hearts:3}})")
        n_ = await g.ev("() => { clearAllMonsterTimers(); ensureLogical(10); for (let k = 2; k <= 10; k++) { const L = logicalRooms[k]; if (L && L.layout.device && L.layout.device.type === 'monolith' && L.layout.terminal && L.layout.terminal.mode === 'stand' && !L.layout.requiresKey) return k; } return 0; }")
        if n_: found = (s_, n_); break
    seed, n = found
    await g.ev(f"startGame({{seed:{seed}, maxDoors:10, door:{n}, units:[1,2,3,4,5,6], difficulty:'normal', hearts:3}})")
    await pg.wait_for_timeout(600); await g.ev("clearAllMonsterTimers()")
    dev = await g.ev("() => { const r = activeRooms[currentDoor]; return { dev: r.layout.device && r.layout.device.type, spot: puzzleSpotName(r) }; }")
    # 석문 옆 틈 = 문 바로 앞까지 순간 이동 (학생이 옆으로 비집고 들어간 상황)
    await g.ev("() => { const r = activeRooms[currentDoor], d = r.doors[0]; player.x = d.worldX + 0.4; player.z = d.worldZ + 1.2; }")
    await pg.wait_for_timeout(500)
    prox = await g.ev("document.getElementById('proximity-text').innerText")
    await g.key('KeyE'); await pg.wait_for_timeout(500)
    st = await g.state(); toast = (await ui(g))['toast']
    record(f"monolith room ({dev['dev']}): pressing E at the door does NOT open the puzzle", not st['ui']['puzzle'], f"prox='{prox}'")
    record('…the door tells where to solve it instead', '문제를 풀면' in toast and dev['spot'] in toast, toast)
    await g.ev("() => { const r = activeRooms[currentDoor]; player.x = r.boardWorldPos.x; player.z = r.boardWorldPos.z + 0.6; }")
    await pg.wait_for_timeout(500)
    await g.key('KeyE'); await pg.wait_for_timeout(500)
    st = await g.state()
    record('the puzzle opens at the device (the one place to solve it)', st['ui']['puzzle'])
    await g.solve_open_puzzle(True); await pg.wait_for_timeout(800)
    st = await g.state()
    record('solving at the device opens the door', st['room']['solved'] and st['room']['unlocked'])
    # ---------- 3) 시즌2 퓨즈 방: 아이템은 장치에, 부족하면 문제가 안 열림 / 단서 쪽지로 멀리서 열기 불가
    seed, n = await g.ev(FIND, {'season': 2, 'kind': 'key'})
    await g.ev(f"startGame({{seed:{seed}, maxDoors:10, door:{n}, units:[1,2,3,4,5,6], difficulty:'normal', hearts:3}})")
    await pg.wait_for_timeout(600); await g.ev("clearAllMonsterTimers(); keysCount = 0; hintsLeft = 2; updateHUD();")
    need = (await g.state())['room']['keysNeeded']
    await g.ev("useHint()"); await pg.wait_for_timeout(400)
    st = await g.state()
    record('단서 쪽지 button far from the device does NOT open the puzzle', not st['ui']['puzzle'], (await ui(g))['toast'])
    await g.ev("() => { const r = activeRooms[currentDoor], d = r.doors[0]; player.x = d.worldX; player.z = d.worldZ + 1.3; }")
    await pg.wait_for_timeout(400); await g.key('KeyE'); await pg.wait_for_timeout(400)
    record('item room: door does not open the puzzle either', not (await g.state())['ui']['puzzle'])
    await g.ev("() => { const r = activeRooms[currentDoor]; player.x = r.boardWorldPos.x; player.z = r.boardWorldPos.z + 0.6; }")
    await pg.wait_for_timeout(500)
    prox = await g.ev("document.getElementById('proximity-text').innerText")
    await g.key('KeyE'); await pg.wait_for_timeout(400)
    record(f'device without fuses ({need} needed): puzzle stays closed, prompt says how many', not (await g.state())['ui']['puzzle'] and f'0/{need}' in prox, prox)
    await g.ev(f"() => {{ keysCount = {need}; updateHUD(); }}"); await pg.wait_for_timeout(400)
    prox = await g.ev("document.getElementById('proximity-text').innerText")
    await g.key('KeyE'); await pg.wait_for_timeout(500)
    st = await g.state()
    record('with enough fuses the device takes them and opens the puzzle', st['ui']['puzzle'] and st['keys'] == 0 and '끼우고' in prox, prox)
    await g.ev("closePuzzleModal()")
    # ---------- 시즌별 바닥: 하수도 객실은 가운데 배수 철망 = 금속 발소리
    srf = await g.ev("() => { const r = activeRooms[currentDoor]; return [surfaceAt(r, 0, 5), surfaceAt(r, r.layout.W / 2 - 1, 5)]; }")
    record('sewer floor: centre grate = metal footsteps, sides = stone', srf in (['metal', 'stone'], ['stone', 'stone']), str(srf))
    record('v6.1: no page errors', not g.errors, '; '.join(g.errors[:3]))
    print('SUMMARY', sum(1 for r in RESULTS if r[1]), '/', len(RESULTS))
    json.dump(RESULTS, open('/home/claude/scenario_results_v61.json', 'w'), ensure_ascii=False, indent=1)
    await b.close(); await p.stop()

asyncio.run(main())
