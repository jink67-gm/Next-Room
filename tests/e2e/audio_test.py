"""NEXT ROOM V5 오디오 브라우저 검사 (Chromium 기본 자동재생 정책 = 사용자 입력 전 재생 차단).
- 입력 전: AudioContext 미생성·재생 시도 없음·자동재생 경고/오류 없음
- 시작 클릭 후: 잠금 해제, 로비→탐험 BGM 크로스페이드, 루프 구간
- 장면 9곡 전환, 404 없음, BGM/SFX 볼륨 독립
- 발소리: 움직일 때만, 같은 파일 연속 없음, 웅크리기 토글 무음, 걷기/웅크림/달리기 간격, 카펫/나무/돌/금속 표면, 옛 합성 발소리(오실레이터) 0회
"""
import asyncio, sys, json, math
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from playwright.async_api import async_playwright
from harness import Game
BASE = 'http://127.0.0.1:8765/index.html'
R = []
def rec(name, ok, detail=''):
    R.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + str(detail) if detail != '' else ''), flush=True)

HOOK = """() => {
  window.__osc = 0; window.__steps = []; window.__playErrors = 0;
  const C = window.AudioContext; if (C && !C.__hooked) { const o = C.prototype.createOscillator; C.prototype.createOscillator = function(){ window.__osc++; return o.apply(this, arguments); }; C.__hooked = true; }
  const A = window.NextRoomAudio; const pf = A.playFootstep.bind(A);
  A.playFootstep = function(s, m, v){ const r = pf(s, m, v); window.__steps.push({t: performance.now(), s, m, file: A.lastStepFile}); return r; };
}"""

async def main():
    p = await async_playwright().start()
    b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])  # 자동재생 허용 플래그 없음
    ctx = await b.new_context(viewport={'width': 480, 'height': 300})
    pg = await ctx.new_page()
    logs, bad = [], []
    pg.on('console', lambda m: logs.append((m.type, m.text)))
    pg.on('pageerror', lambda e: logs.append(('pageerror', str(e))))
    pg.on('response', lambda r: bad.append((r.status, r.url)) if r.status >= 400 and 'fonts.g' not in r.url else None)
    failed_req = []
    pg.on('requestfailed', lambda r: failed_req.append(r.url))
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())  # 샌드박스는 외부 글꼴 접속 불가 → 의도적으로 차단
    await pg.add_init_script('window.__noPointerLock = true;')  # 헤드리스 포인터 잠금은 화면 합성을 크게 느리게 함 (마우스 둘러보기는 mouselook_test.py)
    await pg.add_init_script("try { localStorage.setItem('mathDoorsCleared', '3'); } catch (e) {}")   # 단계 잠금 해제
    await pg.goto(BASE)
    await pg.wait_for_function("window.NextRoomAudio && typeof activeRooms !== 'undefined'", timeout=20000)
    await pg.wait_for_timeout(1500)
    g = Game(pg)
    st = await g.ev('NextRoomAudio.status()')
    rec('before any input: no AudioContext, nothing playing', not st['unlocked'] and not st['webAudio'] and st['track'] is None and st['stats']['bgmStarts'] == 0, st)
    autoplay_msgs = [t for t in logs if 'autoplay' in t[1].lower() or 'notallowed' in t[1].lower() or "wasn't allowed to start" in t[1].lower() or 'audiocontext was not allowed' in t[1].lower()]
    rec('before any input: no autoplay warnings/errors in console', not autoplay_msgs, autoplay_msgs[:2])
    await pg.evaluate('window.__dtCap = 0.34')
    await g.ev(HOOK)
    # 게임 시작 클릭 (실제 클릭)
    await g.ev("() => { window.__forceSeed = 4242; selectStageCount(10); selectDifficulty('easy'); }")
    await pg.click('text=새 게임 시작')
    await pg.wait_for_timeout(2500)
    st = await g.ev('NextRoomAudio.status()')
    rec('after start click: audio unlocked, AudioContext running', st['unlocked'] and st['webAudio'] and st['ctxState'] == 'running', st['ctxState'])
    rec('after start click: exploration BGM playing', st['track'] == '02_hotel_exploration', st['track'])
    loop = await g.ev("() => NextRoomAudio.buffers.get('bgm/02_hotel_exploration').then(b => ({dur: b.duration, s: b._loop.start, e: b._loop.end}))")
    rec('BGM loop points trim only decoder padding (seamless loop)', loop['s'] < 0.15 and loop['dur'] - loop['e'] < 0.15 and loop['e'] - loop['s'] > 40, loop)
    # 장면 전환 9곡
    seen = {}
    for mode in ['lobby', 'explore', 'puzzle', 'darkRoom', 'gale', 'echo', 'ink', 'warden', 'decoy', 'safe', 'explore']:
        await g.ev(f"setBgmMode('{mode}')")
        await pg.wait_for_timeout(1700)
        seen[mode] = (await g.ev('NextRoomAudio.status()'))['track']
    want = {'lobby': '01_title_lobby', 'explore': '02_hotel_exploration', 'puzzle': '03_math_puzzle', 'darkRoom': '04_blackout_darkroom', 'gale': '05_gale_echo_tension', 'echo': '05_gale_echo_tension', 'ink': '06_ink_chase', 'warden': '07_warden_library', 'decoy': '08_decoy_secretrooms', 'safe': '09_safe_recovery'}
    rec('all 9 BGM tracks play for their game states', all(seen[k] == v for k, v in want.items()), seen)
    xf = await g.ev("""() => new Promise(res => { setBgmMode('puzzle'); setTimeout(() => { const A = NextRoomAudio; res({cur: A.track.gain.gain.value}); }, 400); })""")
    await pg.wait_for_timeout(1600)
    rec('crossfade: new track fades in (not instant)', 0.05 < xf['cur'] < 0.95, xf)
    await g.ev("setBgmMode('explore')"); await pg.wait_for_timeout(1500)
    # 볼륨 독립
    await pg.click('#game-hud button:has-text("🎚️")'); await pg.wait_for_timeout(200)
    await pg.fill('#audio-bgm-volume', '0'); await pg.dispatch_event('#audio-bgm-volume', 'input')
    await pg.wait_for_timeout(500)
    v = await g.ev("({bgm: NextRoomAudio.bgmBus.gain.value, sfx: NextRoomAudio.sfxBus.gain.value})")
    await pg.fill('#audio-bgm-volume', '38'); await pg.dispatch_event('#audio-bgm-volume', 'input')
    await pg.fill('#audio-sfx-volume', '20'); await pg.dispatch_event('#audio-sfx-volume', 'input'); await pg.wait_for_timeout(500)
    v2 = await g.ev("({bgm: NextRoomAudio.bgmBus.gain.value, sfx: NextRoomAudio.sfxBus.gain.value})")
    await pg.fill('#audio-sfx-volume', '75'); await pg.dispatch_event('#audio-sfx-volume', 'input')
    await g.ev('toggleAudioSettings(false)')
    rec('BGM and SFX sliders are independent', v['bgm'] < 0.02 and v['sfx'] > 0.7 and abs(v2['bgm'] - 0.38) < 0.03 and abs(v2['sfx'] - 0.2) < 0.03, (v, v2))
    await g.ev("clearAllMonsterTimers()")
    # ---- 발소리
    await g.ev("window.__steps = []; window.__osc = 0")
    await pg.wait_for_timeout(1500)
    rec('standing still: no footsteps', len(await g.ev('window.__steps')) == 0)
    await g.key('KeyC'); await pg.wait_for_timeout(600); await g.key('KeyC'); await pg.wait_for_timeout(600)
    rec('crouch toggle itself makes no footstep sound', len(await g.ev('window.__steps')) == 0)
    # 걷기 (카펫 가운데)
    await g.ev("NextRoomDebug.lookAtLocal(0, 15)")
    await pg.keyboard.down('w'); await pg.wait_for_timeout(3000); await pg.keyboard.up('w')
    steps = await g.ev('window.__steps')
    walk = [s for s in steps if s['m'] == 'walk']
    ints = [walk[i + 1]['t'] - walk[i]['t'] for i in range(len(walk) - 1)]
    rec('walking: footsteps every ~0.46 s, carpet in the centre runner', len(walk) >= 4 and all(380 < x < 650 for x in ints) and all(s['s'] == 'carpet' for s in walk), (len(walk), [round(x) for x in ints][:6], {s['s'] for s in walk}))
    rep = [i for i in range(len(steps) - 1) if steps[i]['file'] == steps[i + 1]['file']]
    rec('same footstep file never plays twice in a row', not rep, [s['file'] for s in steps][:8])
    await pg.wait_for_timeout(250)
    n0 = len(await g.ev('window.__steps')); await pg.wait_for_timeout(1500); n1 = len(await g.ev('window.__steps'))
    fv = await g.ev('NextRoomAudio.status().footVoices')
    rec('stop moving → footsteps stop (no new steps, voices cut)', n0 == n1 and fv == 0, (n0, n1, fv))
    # 웅크려 걷기
    await g.ev("window.__steps = []"); await g.key('KeyC'); await pg.wait_for_timeout(300)
    await g.ev("NextRoomDebug.lookAtLocal(0, 2)")
    await pg.keyboard.down('w'); await pg.wait_for_timeout(3000); await pg.keyboard.up('w'); await g.key('KeyC')
    cr = await g.ev('window.__steps')
    ci = [cr[i + 1]['t'] - cr[i]['t'] for i in range(len(cr) - 1)]
    rec('crouch-walking: crouch files, slower cadence (~0.72 s)', len(cr) >= 2 and all(s['m'] == 'crouch' for s in cr) and all(600 < x < 950 for x in ci), (len(cr), [round(x) for x in ci]))
    # 나무 (카펫 띠 밖) — 옆벽 쪽으로 걷기
    await g.ev("window.__steps = []; NextRoomDebug.lookAtLocal(-6, 9)")
    await pg.keyboard.down('w'); await pg.wait_for_timeout(1800); await pg.keyboard.up('w')
    wd = await g.ev("() => { const r = NextRoomDebug.room(); const lp = toLocal(r, player.x, player.z); return {steps: window.__steps, x: lp.x, W: r.roomW}; }")
    rec('off the runner near the wall: wood surface', any(s['s'] == 'wood' for s in wd['steps']), ({s['s'] for s in wd['steps']}, round(wd['x'], 2), wd['W']))
    # 표면 판정(돌/금속)과 달리기 모드: 방 종류별로 확인
    surf = await g.ev("""() => { const mk = arch => ({ roomArch: arch, layout: { creaks: [], W: 14, L: 20, frontD: 20, chasm: null } });
      return { grandHall: surfaceAt(mk('grandHall'), 0, 5), ink: surfaceAt(mk('ink'), 0, 5), storage: surfaceAt(mk('storage'), 2, 5), guestCenter: surfaceAt(mk('guest'), 0, 5), guestSide: surfaceAt(mk('guest'), 5, 5),
        bridge: surfaceAt({ roomArch: 'bridge', layout: { creaks: [], W: 13, L: 24, frontD: 24, chasm: { d0: 7, d1: 13 } } }, 0, 10) }; }""")
    rec('surface map: grand hall/ink = stone, storage = metal, runner = carpet, side = wood, bridge = wood', surf == {'grandHall': 'stone', 'ink': 'stone', 'storage': 'metal', 'guestCenter': 'carpet', 'guestSide': 'wood', 'bridge': 'wood'}, surf)
    await g.ev("window.__steps = []; inkState.active = true; NextRoomDebug.lookAtLocal(0, 15)")
    await pg.keyboard.down('w'); await pg.wait_for_timeout(2000); await pg.keyboard.up('w')
    rn = await g.ev('window.__steps'); await g.ev("inkState.active = false")
    ri = [rn[i + 1]['t'] - rn[i]['t'] for i in range(len(rn) - 1)]
    rec('running (fleeing a chase): run files, faster cadence (~0.33 s)', len(rn) >= 3 and all(s['m'] == 'run' for s in rn) and all(250 < x < 480 for x in ri), (len(rn), [round(x) for x in ri][:5]))
    # 실제 디코딩 성공 (금속·돌 포함 44개 전부)
    dec = await g.ev("""() => Promise.all(['carpet','wood','stone','metal'].flatMap(s => [['walk',5],['crouch',3],['run',3]].flatMap(([m,n]) => Array.from({length:n},(_,i)=>NextRoomAudio._load('sfx/'+NextRoomAudio.FOOTSTEPS.file(s,m,i+1)).then(b=>!!b))))).then(a => ({ok: a.filter(Boolean).length, total: a.length}))""")
    rec('all 44 footstep files load and decode', dec['ok'] == 44 == dec['total'], dec)
    # 기존 효과음 54개 전부 디코딩 (괴물 경고음 등)
    fx = await g.ev("""() => { const names = [...new Set(Object.values(NextRoomAudio.EFFECTS))]; return Promise.all(names.map(n => NextRoomAudio._load('sfx/' + n).then(b => b ? null : n))).then(a => ({total: names.length, failed: a.filter(Boolean)})); }""")
    rec('all 54 other effect files (monster warnings etc.) load and decode', fx['total'] == 54 and not fx['failed'], fx)
    rec('old synthesized footsteps never played (0 oscillators)', await g.ev('window.__osc') == 0, await g.ev('window.__osc'))
    st = await g.ev('NextRoomAudio.status()')
    rec('no audio load failures', not st['failed'] and not st['stats']['errors'], (st['failed'], st['stats']['errors'][:3]))
    rec('no HTTP 4xx/5xx responses (no 404)', not bad, bad[:5])
    non_font = [u for u in failed_req if 'fonts.googleapis.com' not in u]
    rec('only failed request is the blocked Google Fonts stylesheet (sandbox)', not non_font, (failed_req[:3]))
    font_errs = sum(1 for u in failed_req if 'fonts.googleapis.com' in u)
    errs = [t for t in logs if t[0] in ('error', 'pageerror')]
    errs = errs[font_errs:] if all('ERR_FAILED' in e[1] for e in errs[:font_errs]) else errs
    autoplay_msgs = [t for t in logs if 'autoplay' in t[1].lower() or 'notallowed' in t[1].lower() or 'not allowed to start' in t[1].lower()]
    rec('no console errors / autoplay errors during the whole test', not errs and not autoplay_msgs, (errs[:3], autoplay_msgs[:2]))
    # 뮤트하면 발소리도 정지
    await g.ev("window.__steps = []; toggleAudioMute()")
    await pg.keyboard.down('w'); await pg.wait_for_timeout(1500); await pg.keyboard.up('w')
    rec('mute: no footsteps scheduled', len(await g.ev('window.__steps')) == 0)
    await g.ev("toggleAudioMute()")
    print('SUMMARY', sum(1 for r in R if r[1]), '/', len(R))
    json.dump([(a, b, str(c)) for a, b, c in R], open('/home/claude/audio_test_results.json', 'w'), ensure_ascii=False, indent=1)
    await b.close(); await p.stop()
asyncio.run(main())
