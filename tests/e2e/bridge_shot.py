import asyncio, sys
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch
from agent import play_room
async def main():
    p, b, ctx, pg = await launch(viewport=(960, 600), dtcap=0.1)
    g = Game(pg)
    await g.ev("startGame({seed:3131, maxDoors:30, door:2, units:[4], difficulty:'easy', hearts:3})")
    await g.ev("clearAllMonsterTimers(); isPlaying = true;")
    await pg.wait_for_timeout(500)
    await g.ev("() => { player.z -= 3.5; player.yaw = player.targetYaw = 0.0; player.pitch = player.targetPitch = -0.25; }")
    await pg.wait_for_timeout(600); await pg.screenshot(path='/home/claude/bridge_before.png')
    prob = await g.ev('NextRoomDebug.problem()'); print(prob['type'], prob.get('bridgeSplit'), prob['q'])
    await g.ev('openPuzzleModal()'); await pg.wait_for_timeout(400)
    await pg.screenshot(path='/home/claude/bridge_modal.png')
    await g.solve_open_puzzle(True)
    await pg.wait_for_timeout(500); await pg.screenshot(path='/home/claude/bridge_mid.png')
    await pg.wait_for_timeout(2500); await pg.screenshot(path='/home/claude/bridge_after.png')
    print(await g.state())
    # walk across for real
    t = await g.targets()
    r = await g.walk_to(t['exit']['x'], t['exit']['d'], tol=0.5, timeout=30); print('cross', r, (await g.state())['door'], g.errors[:3])
    await b.close(); await p.stop()
asyncio.run(main())
