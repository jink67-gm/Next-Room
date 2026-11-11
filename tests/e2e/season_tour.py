"""V6.1 시즌별 화면 점검: 시즌마다 방 종류별로 입구 시점·가운데에서 뒤돌아본 시점 스크린샷 (눈으로 확인용)
실행: python3 tests/e2e/season_tour.py <출력폴더> <easy|normal|challenge> [방종류,...]"""
import asyncio, sys
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots_season'
DIFF = sys.argv[2] if len(sys.argv) > 2 else 'normal'
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
SEASON = {'easy': 1, 'normal': 2, 'challenge': 3}[DIFF]
async def main():
    import os; os.makedirs(OUT, exist_ok=True)
    p, b, ctx, pg = await launch(viewport=(960, 600), dtcap=0.1)
    g = Game(pg)
    plan = await g.ev(f"() => {{ NextRoomCore.setSeason({SEASON}); return NextRoomCore.planStage(30, 3131).rooms.slice(1).map(r => r.arch); }}")
    seen = {}
    for i, a in enumerate(plan):
        if a not in seen and (not ONLY or a in ONLY): seen[a] = i + 1
    print(DIFF, seen, flush=True)
    for arch, door in seen.items():
        await g.ev(f"startGame({{seed:3131, maxDoors:30, door:{door}, units:[1,2,3,4,5,6], difficulty:'{DIFF}', hearts:3}})")
        await g.ev("clearAllMonsterTimers(); isPlaying = true;")
        await pg.wait_for_timeout(400)
        if arch == 'darkRoom': await g.ev("flashlightOn = true")
        await g.ev("() => { player.z -= 1.0; player.yaw = player.targetYaw = 0; player.pitch = player.targetPitch = -0.08; }")
        await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}/s{SEASON}_{door:02d}_{arch}_front.png')
        await g.ev("() => { const r = NextRoomDebug.room(); const t = NextRoomCore.resolvePoint(r.layout, 0, r.roomLen*0.55, 0.42, roomCollisionState(r)); player.x = r.centerX + t.x; player.z = r.zStart - t.d; player.yaw = player.targetYaw = Math.PI; }")
        await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}/s{SEASON}_{door:02d}_{arch}_back.png')
    print('errors', g.errors[:5], flush=True)
    await b.close(); await p.stop()
asyncio.run(main())
