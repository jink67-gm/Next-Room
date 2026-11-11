import asyncio, sys
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch
async def main():
    p, b, ctx, pg = await launch(viewport=(960, 640), dtcap=0.1)
    g = Game(pg)
    await g.ev("startGame({seed:3030, maxDoors:30, door:18, units:[3], difficulty:'easy', hearts:3})")
    await g.ev("clearAllMonsterTimers(); isPlaying = true;")
    await pg.wait_for_timeout(400)
    prob = await g.ev('NextRoomDebug.problem()'); print(prob['type'], prob['q'], prob['front'], prob['side'], prob['total'])
    await g.ev('openPuzzleModal()'); await pg.wait_for_timeout(300)
    await pg.screenshot(path='/home/claude/voxel_modal0.png')
    await g.solve_open_puzzle(True)
    await pg.wait_for_timeout(300)
    # look at the voxel pad
    await g.ev("() => { const r=NextRoomDebug.room(); const d=r.layout.device; const t=NextRoomCore.resolvePoint(r.layout, d.x, d.d-3.2, 0.42, roomCollisionState(r)); player.x=r.centerX+t.x; player.z=r.zStart-t.d; player.yaw=player.targetYaw=Math.atan2(-(d.x-t.x), d.d-t.d); player.pitch=player.targetPitch=-0.35; }")
    await pg.wait_for_timeout(3500)
    await pg.screenshot(path='/home/claude/voxel_3d.png')
    print(await g.ev("NextRoomDebug.room().mechanism3D.blocks.filter(b=>b.visible).length"), sum(sum(r) for r in prob['targetGrid']))
    await b.close(); await p.stop()
asyncio.run(main())
