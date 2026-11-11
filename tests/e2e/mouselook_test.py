"""NEXT ROOM V6 — 마우스 둘러보기(포인터 잠금) 검증. 실행: MD_LOCK=1 python3 tests/e2e/mouselook_test.py"""
import asyncio, sys, os, json
os.environ['MD_LOCK'] = '1'
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch

RESULTS = []
def record(name, ok, detail=''):
    RESULTS.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + detail if detail else ''), flush=True)

async def main():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    await g.start(doors=10, diff='easy', seed=4242)
    await pg.wait_for_timeout(800)
    locked = await g.ev("!!document.pointerLockElement")
    if not locked:   # 브라우저가 사용자 동작 없이 잠금을 거절하면 화면 클릭으로 켠다
        await pg.mouse.click(240, 150); await pg.wait_for_timeout(600)
        locked = await g.ev("!!document.pointerLockElement")
    record('start (or one click) turns on mouse look (pointer lock)', locked)
    y0 = await g.ev("player.targetYaw"); p0 = await g.ev("player.targetPitch")
    for _ in range(6):
        await pg.mouse.move(240 + 40, 150 + 10); await pg.mouse.move(240, 150)
    await g.ev("() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 120, movementY: 30 }))")
    y1 = await g.ev("player.targetYaw"); p1 = await g.ev("player.targetPitch")
    record('moving the mouse (no button held) turns the view', abs(y1 - y0) > 0.05 and abs(p1 - p0) > 0.01, f'yaw {y0:.2f}→{y1:.2f} pitch {p0:.2f}→{p1:.2f}')
    await g.ev("setMouseSens(2)")
    y2 = await g.ev("player.targetYaw")
    await g.ev("() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 120, movementY: 0 }))")
    y3 = await g.ev("player.targetYaw")
    record('sensitivity slider doubles the turn', abs(abs(y3 - y2) - 2 * abs(y1 - y0)) < 0.02, f'{abs(y1-y0):.3f} vs {abs(y3-y2):.3f}')
    await g.ev("setMouseSens(1)")
    await g.ev("toggleAudioSettings(true)"); await pg.wait_for_timeout(500)
    record('opening a window (settings) releases the mouse', not await g.ev("!!document.pointerLockElement"))
    await g.ev("toggleAudioSettings(false)"); await pg.wait_for_timeout(600)
    record('closing the window locks the mouse again', await g.ev("!!document.pointerLockElement"))
    # ESC는 브라우저가 직접 잠금을 푼다(헤드리스는 키 전달 불가) → 같은 결과인 exitPointerLock으로 확인
    await g.ev("document.exitPointerLock()"); await pg.wait_for_timeout(500)
    record('after ESC (lock released) the view no longer follows the mouse', not await g.ev("!!document.pointerLockElement"))
    hint = await g.ev("!document.getElementById('mouselook-hint').classList.contains('hidden')")
    record('hint "click to look around" shows while released', hint)
    await pg.mouse.click(240, 150); await pg.wait_for_timeout(600)
    record('clicking the screen locks the mouse again', await g.ev("!!document.pointerLockElement"))
    await g.ev("returnToLobby()"); await pg.wait_for_timeout(500)
    record('returning to the lobby releases the mouse', not await g.ev("!!document.pointerLockElement"))
    record('mouse look: no page errors', not g.errors, '; '.join(g.errors[:3]))
    print('SUMMARY', sum(1 for r in RESULTS if r[1]), '/', len(RESULTS))
    json.dump(RESULTS, open('/home/claude/scenario_results_mouselook.json', 'w'), ensure_ascii=False, indent=1)
    await b.close(); await p.stop()

asyncio.run(main())
