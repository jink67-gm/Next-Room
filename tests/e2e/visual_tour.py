"""모든 방 종류를 체크포인트 경로로 열어 입구 시점·뒤돌아본 시점 스크린샷을 남긴다 (눈으로 확인용)."""
import asyncio, sys, json
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots'
async def main():
    import os; os.makedirs(OUT, exist_ok=True)
    p, b, ctx, pg = await launch(viewport=(960, 600), dtcap=0.1)
    g = Game(pg)
    plan = await g.ev("() => NextRoomCore.planStage(30, 3131).rooms.slice(1).map(r => r.arch)")
    seen = {}
    for i, a in enumerate(plan):
        if a not in seen and i >= 1: seen[a] = i + 1
    print(seen)
    for arch, door in seen.items():
        await g.ev(f"startGame({{seed:3131, maxDoors:30, door:{door}, units:[1,2,3,4,5,6], difficulty:'easy', hearts:3}})")
        await g.ev("clearAllMonsterTimers(); isPlaying = true;")
        await pg.wait_for_timeout(400)
        if arch == 'darkRoom': await g.ev("flashlightOn = true")
        await g.ev("() => { player.z -= 1.0; player.yaw = player.targetYaw = 0; player.pitch = player.targetPitch = -0.08; }")
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=f'{OUT}/{door:02d}_{arch}_front.png')
        # stand in the middle and look back toward the entrance
        await g.ev("() => { const r = NextRoomDebug.room(); const t = NextRoomCore.resolvePoint(r.layout, 0, r.roomLen*0.55, 0.42, roomCollisionState(r)); player.x = r.centerX + t.x; player.z = r.zStart - t.d; player.yaw = player.targetYaw = Math.PI; }")
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=f'{OUT}/{door:02d}_{arch}_back.png')
        if arch in ('library', 'bridge', 'decoy', 'ink'):
            await g.ev("() => { const r = NextRoomDebug.room(); player.x = r.centerX + r.layout.W*0.35; player.z = r.zStart - r.roomLen*0.3; player.yaw = player.targetYaw = 0.5; }")
            await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'{OUT}/{door:02d}_{arch}_side.png')
    print('errors', g.errors[:5])
    await b.close(); await p.stop()
asyncio.run(main())
