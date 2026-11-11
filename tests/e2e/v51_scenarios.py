"""NEXT ROOM V5.1 + V7 — 학생 피드백·괴물 재설계 검증 (실제 키보드 조작)
1) 돌풍 경고 중 다음 방으로 도망 → 돌풍이 따라와서 다음 방을 휩쓴다 (안전한 다음 방)
2) 돌풍 경고 중 다음 방에 숨을 곳이 없으면(도서관) → 문 앞에서 막힘
3) 메아리: 옷장 밖에서 손전등 끄고 멈추면 피해 없음 / 옷장에 숨거나 손전등을 켜면 들킴
4) 오답이: 생명 1에서 가짜 문 → 사망 / 생명 2에서 두 번 → 사망
"""
import asyncio, sys, json, math
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch
from agent import hide_until_safe, walk_safe

RESULTS = []
def record(name, ok, detail=''):
    RESULTS.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + detail if detail else ''), flush=True)

async def begin(g, pg, seed, door, hearts=3, diff='normal'):
    await g.ev(f"startGame({{seed:{seed}, maxDoors:10, door:{door}, units:[1,2,3,4,5,6], difficulty:'{diff}', hearts:{hearts}}})")
    await pg.wait_for_timeout(300); await g.hook_hits()

async def wait_for(g, pg, fn, n=250, step=100):
    for _ in range(n):
        st = await g.state()
        if fn(st): return st
        await pg.wait_for_timeout(step)
    return None

FIND = """(want) => { for (let seed = 1; seed < 400; seed++) { const P = NextRoomCore.planStage(10, seed).rooms;
  for (let n = 3; n <= 9; n++) { const r = P[n], nx = P[n + 1]; if (!r) continue;
    const unsafeNext = !nx || ['ink', 'library', 'bridge'].includes(nx.arch);
    if (want === 'carry' && r.events.gale && !unsafeNext && r.arch !== 'darkRoom') return [seed, n];
    if (want === 'block' && r.events.gale && nx && nx.arch === 'library' && r.arch !== 'darkRoom') return [seed, n];
    if (want === 'echo' && r.events.echo && r.arch !== 'darkRoom') return [seed, n];
    if (want === 'decoy' && r.arch === 'decoy') return [seed, n]; } } return null; }"""

async def find(g, want):
    return await g.ev(FIND, want)

async def gale_carry(g, pg):
    seed, n = await find(g, 'carry'); g.log(f'carry seed={seed} door={n}')
    await begin(g, pg, seed, n)
    # 예약된 돌풍을 잠시 보류하고 출구 앞까지 간 다음, 같은 돌풍 이벤트를 출구 앞에서 발생시킨다
    await g.ev(f"() => {{ clearTimeout(galeSpawnTimerId); clearTimeout(whisperSpawnTimerId); markRoomSolved(activeRooms[{n}]); }}")
    t = await g.targets()
    await walk_safe(g, t['door']['x'], t['door']['d'] - 1.6, g.log, tol=0.6)
    await g.ev("triggerGaleEvent()")
    st = await wait_for(g, pg, lambda s: s['gale']['warning'])
    record(f'carry: gale warning starts in DOOR {n}', st is not None)
    await g.walk_to(t['door']['x'], t['door']['d'] + 2.5, tol=0.8, timeout=8, crouch=False)
    st = await wait_for(g, pg, lambda s: s['door'] == n + 1, n=40)
    record(f'carry: escaped into DOOR {n + 1} during the warning', st is not None)
    st = await g.state()
    record('carry: gale still coming after entering the next room', st['gale']['warning'] or st['gale']['active'], str(st['gale']))
    swept = await g.ev("""(nn) => new Promise(res => { let seen = false; const t0 = performance.now(); (function f(){ const r = activeRooms[nn];
        if (galeState.active && galeState.phase === 'SWEEPING' && galeState.z < r.zStart - 2 && galeState.z > r.zEnd) seen = true;
        if (seen || performance.now() - t0 > 15000) res(seen); else requestAnimationFrame(f); })(); })""", n + 1)
    record(f'carry: gale sweeps through DOOR {n + 1} (the room the player fled to)', swept)

async def gale_block(g, pg):
    seed, n = await find(g, 'block'); g.log(f'block seed={seed} door={n}')
    await begin(g, pg, seed, n)
    await g.ev(f"() => {{ clearTimeout(galeSpawnTimerId); clearTimeout(whisperSpawnTimerId); markRoomSolved(activeRooms[{n}]); }}")
    t = await g.targets()
    await walk_safe(g, t['door']['x'], t['door']['d'] - 1.6, g.log, tol=0.6)
    await g.ev("triggerGaleEvent()")
    st = await wait_for(g, pg, lambda s: s['gale']['warning'])
    t = await g.targets()
    await g.walk_to(t['door']['x'], t['door']['d'] + 2.5, tol=0.8, timeout=6, crouch=False)
    st = await g.state()
    record('block: next room is the library (no closets) → door blocks during gale warning', st['door'] == n and (st['gale']['warning'] or st['gale']['active']), f"door={st['door']} gale={st['gale']}")
    h0 = st['hearts']
    ok = await hide_until_safe(g, g.log)
    st = await g.state()
    record(f'block: player stays in DOOR {n} and survives the gale there (hid after being blocked)', ok and st['playing'] and st['door'] == n, f"hearts {h0}→{st['hearts']}")
    await walk_safe(g, t['door']['x'], t['door']['d'] - 1.0, g.log, tol=0.6)
    await g.walk_to(t['door']['x'], t['door']['d'] + 2.5, tol=0.8, timeout=8, crouch=False)
    st = await wait_for(g, pg, lambda s: s['door'] == n + 1, n=40)
    record('block: after the gale the door lets the player through', st is not None)

async def echo_trial(g, pg, mode):
    """mode: 'still' = 옷장 밖에서 손전등 끄고 멈춤(안전) / 'closet' = 옷장에 숨음(들킴) / 'light' = 손전등 켜고 멈춤(들킴)"""
    seed, n = await find(g, 'echo'); g.log(f'echo[{mode}] seed={seed} door={n}')
    await begin(g, pg, seed, n)
    await g.ev("() => { clearTimeout(echoSpawnTimerId); clearTimeout(whisperSpawnTimerId); }")
    t = await g.targets(); pl = (await g.state())['player']
    c = min(t['closets'], key=lambda c: math.hypot(c['x'] - pl['x'], c['d'] - pl['d']))
    await walk_safe(g, c['x'], c['d'], g.log, tol=0.9)
    await g.ev("triggerEchoEvent()")
    st = await wait_for(g, pg, lambda s: s['echo']['warning'] or s['echo']['active'], n=400)
    record(f'echo[{mode}]: event starts in DOOR {n}', st is not None)
    if mode == 'closet':
        await g.key('KeyE')
    want_light = mode == 'light'
    if (await g.state())['flashlight'] != want_light:
        await g.key('KeyF')
    h0 = (await g.state())['hearts']; n_hits = len(await g.ev('window.__hits'))
    for i in range(900):
        st = await g.state()
        if not st['echo']['active'] and not st['echo']['warning']: break
        await pg.wait_for_timeout(120)
    st = await g.state(); hits = (await g.ev('window.__hits'))[n_hits:]
    titles = [h['title'] for h in hits]
    if mode == 'still':
        record('echo: light off + standing still outside a closet → echo passes with no damage', st['playing'] and st['hearts'] == h0 and not titles, f"hearts {h0}→{st['hearts']} hits={titles}")
    elif mode == 'closet':
        record('echo: hiding in a closet → heard and hit (closet breath)', any('옷장' in t for t in titles), f'hits={titles}')
    else:
        record('echo: flashlight on → spotted and hit', any('손전등' in t for t in titles), f'hits={titles}')

async def decoy_door(g, pg, hearts):
    seed, n = await find(g, 'decoy')
    await begin(g, pg, seed, n, hearts=hearts)
    t = await g.targets()
    if t['terminal']:
        await walk_safe(g, t['terminal']['x'], t['terminal']['d'], g.log, tol=0.6)
        await g.key('KeyE'); await pg.wait_for_timeout(400)
        if (await g.state())['ui']['puzzle']: await g.solve_open_puzzle(True)
        await pg.wait_for_timeout(600)
    t = await g.targets()
    wrongs = [d for d in t['decoy'] if not d['correct']]
    for i in range(hearts):
        w = wrongs[i]
        await walk_safe(g, w['x'], w['d'], g.log, tol=0.5)
        await g.key('KeyE'); await pg.wait_for_timeout(2600)
    st = await g.state()
    return st

async def main():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    await gale_carry(g, pg)
    await gale_block(g, pg)
    await echo_trial(g, pg, 'still')
    await echo_trial(g, pg, 'closet')
    await echo_trial(g, pg, 'light')
    st = await decoy_door(g, pg, 1)
    record('decoy: 1 heart + wrong decoy door → game over', not st['playing'] and st['hearts'] == 0, f"playing={st['playing']} hearts={st['hearts']}")
    st = await decoy_door(g, pg, 2)
    record('decoy: 2 hearts + two wrong decoy doors → game over', not st['playing'] and st['hearts'] == 0, f"playing={st['playing']} hearts={st['hearts']}")
    record('v5.1: no page errors', not g.errors, '; '.join(g.errors[:3]))
    print('SUMMARY', sum(1 for r in RESULTS if r[1]), '/', len(RESULTS))
    json.dump(RESULTS, open('/home/claude/scenario_results_v51.json', 'w'), ensure_ascii=False, indent=1)
    await b.close(); await p.stop()

asyncio.run(main())
