"""NEXT ROOM V5 — Playwright 기반 실제 브라우저 시나리오 하네스.
게임을 실제로 실행하고, 키보드(W/C/E/F)와 마우스 클릭으로 조작한다.
시점 방향만 NextRoomDebug.lookAtLocal 로 맞춘다(마우스 드래그 대신). 위치를 순간이동시키지 않는다.
"""
import asyncio, json, math, time
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8765/index.html'
ARGS = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']

class Game:
    def __init__(self, page, log=print):
        self.pg = page
        self.log = log
        self.errors = []
        self.verbose = False
        page.on('pageerror', lambda e: self.errors.append('PAGEERROR ' + str(e)))
        page.on('console', lambda m: self.errors.append('CONSOLE ' + m.text) if m.type == 'error' and 'fonts.googleapis' not in m.text and 'ERR_FAILED' not in m.text else None)

    async def ev(self, js, arg=None):
        return await self.pg.evaluate(js, arg) if arg is not None else await self.pg.evaluate(js)

    async def state(self):
        return await self.ev('NextRoomDebug.state()')

    async def targets(self):
        return await self.ev('NextRoomDebug.targets()')

    async def start(self, doors=10, diff='normal', units=(1, 2, 3, 4, 5, 6), seed=None):
        await self.ev(f"""() => {{ {'window.__forceSeed=%d;' % seed if seed is not None else 'delete window.__forceSeed;'}
            selectStageCount({doors}); selectDifficulty('{diff}');
            document.querySelectorAll('.unit-chk').forEach(c => c.checked = {json.dumps(list(units))}.includes(parseInt(c.value))); }}""")
        await self.pg.click('text=새 게임 시작')
        await self.pg.wait_for_timeout(600)
        await self.hook_hits()

    async def hook_hits(self):
        await self.pg.evaluate("""() => { if (window.__hitHooked) return; window.__hitHooked = true; const orig = applyPlayerHitEffect; window.__hits = [];
            applyPlayerHitEffect = function(o){ window.__hits.push({door: currentDoor, title: o.title, hearts: hearts, fig: wardenState.mode}); return orig(o); }; }""")

    async def key(self, k, hold=0.0):
        if hold:
            await self.pg.keyboard.down(k); await self.pg.wait_for_timeout(int(hold * 1000)); await self.pg.keyboard.up(k)
        else:
            await self.pg.keyboard.press(k)

    async def set_crouch(self, want):
        st = await self.state()
        if st['crouch'] != want and st['closet'] == 'NONE':
            await self.key('KeyC'); await self.pg.wait_for_timeout(80)
            st = await self.state()
        return st['crouch'] == want

    async def walk_to(self, tx, td, tol=0.55, timeout=40.0, crouch='auto', stop_on=None):
        """경로 탐색으로 얻은 지점들을 따라 W키를 누른 채 시점을 돌리며 걸어간다."""
        t0 = time.time()
        path = await self.ev('([x,d]) => NextRoomDebug.pathLocal(x,d)', [tx, td])
        if not path:
            info = await self.ev("() => { const r=NextRoomDebug.room(); const lp=toLocal(r,player.x,player.z); const st=Object.assign(roomCollisionState(r),{crouch:true}); const g=NextRoomCore.makeGrid(r.layout,st,NextRoomCore.PLAYER_R+0.06,0.25); return {door: currentDoor, lp, blocked: NextRoomCore.pointBlocked(r.layout,lp.x,lp.d,0.48,st), near: NextRoomCore.nearestFree(g,lp.x,lp.d,1.2), closet: closetState, L: r.roomLen}; }")
            self.log(f'  ! no path to ({tx:.1f},{td:.1f}) diag={info}')
            await self.pg.keyboard.down('w'); await self.pg.wait_for_timeout(250); await self.pg.keyboard.up('w')
            return False
        idx = 0
        holding = False
        door0 = (await self.state())['door']
        last_pos = None; stuck = 0
        try:
            while time.time() - t0 < timeout:
                st = await self.state()
                if stop_on and await stop_on(st):
                    return 'stopped'
                if not st['playing'] or st['closet'] != 'NONE' or any(st['ui'][k] for k in ('puzzle', 'emergency', 'shelf')):
                    if holding: await self.pg.keyboard.up('w'); holding = False
                    return 'interrupted'
                p = st['player']
                if p is None: return False
                if st['door'] != door0:
                    return 'door'
                # door changed (crossed threshold)
                while idx < len(path) - 1 and math.hypot(path[idx]['x'] - p['x'], path[idx]['d'] - p['d']) < 0.45:
                    idx += 1
                goal = path[idx]
                if math.hypot(tx - p['x'], td - p['d']) < tol:
                    return True
                if crouch == 'auto':
                    need = await self.ev('([x,d]) => { const r=NextRoomDebug.room(); const st=roomCollisionState(r); st.crouch=false; return NextRoomCore.pointBlocked(r.layout,x,d,NextRoomCore.PLAYER_R,st) && !NextRoomCore.pointBlocked(r.layout,x,d,NextRoomCore.PLAYER_R,Object.assign(st,{crouch:true})); }', [goal['x'], goal['d']])
                    nearBeam = await self.ev('([x,d]) => { const r=NextRoomDebug.room(); return (r.lowBeams||[]).some(b=>Math.abs(d-b.d)<b.hd+1.0 && Math.abs(x-b.x)<b.hw+0.5); }', [p['x'], p['d']])
                    await self.set_crouch(bool(need or nearBeam))
                elif crouch in (True, False):
                    await self.set_crouch(crouch)
                await self.ev('([x,d]) => NextRoomDebug.lookAtLocal(x,d)', [goal['x'], goal['d']])
                if not holding:
                    await self.pg.keyboard.down('w'); holding = True
                await self.pg.wait_for_timeout(70)
                if last_pos and math.hypot(p['x'] - last_pos[0], p['d'] - last_pos[1]) < 0.01:
                    stuck += 1
                    if stuck > 25:
                        path = await self.ev('([x,d]) => NextRoomDebug.pathLocal(x,d)', [tx, td]) or path; idx = 0; stuck = 0
                else:
                    stuck = 0
                last_pos = (p['x'], p['d'])
            self.log(f'  ! walk timeout to ({tx:.1f},{td:.1f}) from {locals().get("p")}')
            return False
        finally:
            if holding: await self.pg.keyboard.up('w')

    async def solve_open_puzzle(self, correct=True):
        prob = await self.ev('NextRoomDebug.problem()')
        t = prob['type']
        if t == 'typeA_match':
            order = await self.ev('puzzleState.shuffledRight.map(o=>o.matchIdx)')
            n = len(prob['pairs'])
            for i in range(n):
                await self.pg.click(f'#match-left-{i}')
                target = i if correct else (i + 1) % n
                await self.pg.click(f'#match-right-{order.index(target)}')
            await self.pg.click('#non-numeric-submit-btn')
        elif t == 'typeB_blank':
            for i, b in enumerate(prob['blanks']):
                await self.pg.click(f'#blank-slot-{i}')
                ans = b['answer'] if correct else ('9' + b['answer'])
                for ch in ans: await self.pg.keyboard.press(ch)
            await self.pg.keyboard.press('Enter')
        elif t == 'typeC_drag':
            cards = prob['cards']
            answers = [s['answer'] for s in prob['slots']]
            if not correct: answers = answers[::-1]
            for a in answers:
                await self.pg.click(f'#drag-card-{cards.index(a)}')
            await self.pg.click('#non-numeric-submit-btn')
        elif t == 'typeD_voxel':
            g = prob['targetGrid']
            for r in range(3):
                for c in range(3):
                    if not prob['footprint'][r][c]: continue
                    clicks = (g[r][c] - 1) if correct else (g[r][c] % 3)
                    for _ in range(clicks): await self.pg.click(f'#voxel-cell-{r}-{c}')
            await self.pg.click('#non-numeric-submit-btn')
        elif t == 'typeF_device':
            ans = prob['a'] if correct else (prob['a'] + '1')
            for ch in ans: await self.pg.keyboard.press(ch)
            await self.pg.keyboard.press('Enter')
        elif t == 'typeE_decoy':
            await self.pg.click('#non-numeric-submit-btn')
        await self.pg.wait_for_timeout(250)
        return t

    async def answer_choice_modal(self, which, correct=True):
        """긴급(옷장 걸쇠)·책 꽂기 모달에서 보기 버튼 클릭."""
        box = '#em-choices' if which == 'emergency' else '#hb-choices'
        ans = await self.ev(f"""() => {{ const btns=[...document.querySelectorAll('{box} button')]; return btns.map(b=>b.innerText.replace(/\\s+/g,'')); }}""")
        prob = await self.ev("hb.prob") if which == 'shelf' else None
        # 정답 문자열 비교: 정답은 deck이 반환한 a. 화면 표시(세로 분수)는 innerText가 '3\\n4' 형태라 비교를 위해 동일 정규화
        a_norm = await self.ev(f"""() => {{ const p = {'hb.prob' if which=='shelf' else 'window.__lastDefense'}; if(!p) return null; const d=document.createElement('div'); d.innerHTML=formatMathHTML(p.a); document.body.appendChild(d); const t=d.innerText.replace(/\\s+/g,''); d.remove(); return t; }}""")
        idx = ans.index(a_norm) if (a_norm in ans and correct) else ([i for i, x in enumerate(ans) if x != a_norm][0])
        await self.pg.click(f'{box} button >> nth={idx}')
        await self.pg.wait_for_timeout(200)

async def launch(viewport=(480, 300), mobile=False, dtcap=0.34):
    p = await async_playwright().start()
    b = await p.chromium.launch(args=ARGS)
    ctx = await b.new_context(viewport={'width': viewport[0], 'height': viewport[1]}, has_touch=mobile, is_mobile=mobile)
    pg = await ctx.new_page()
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    # 그래픽카드 없는 테스트 환경: 게임 로직 테스트는 '가볍게' 그래픽으로 (화면 품질은 visual_tour.py에서 고품질로 따로 확인)
    import os
    if os.environ.get('MD_GFX', 'lite') == 'lite' and viewport[0] < 900:
        await pg.add_init_script("try { if (!localStorage.getItem('mathDoorsGfx')) localStorage.setItem('mathDoorsGfx', 'lite'); } catch (e) {}")
    # 헤드리스 크롬에서 포인터 잠금(마우스 둘러보기)을 켜면 화면 합성이 매우 느려진다 → 기본 끔 (MD_LOCK=1이면 켬)
    if os.environ.get('MD_LOCK') != '1':
        await pg.add_init_script('window.__noPointerLock = true; window.__minRatio = 0.65;')
    # V6.1 단계 잠금: 자동 테스트는 모든 단계를 연 상태로 시작 (잠금 자체는 progression_test.py에서 확인)
    if os.environ.get('MD_FRESH') != '1':
        await pg.add_init_script("try { localStorage.setItem('mathDoorsCleared', '3'); } catch (e) {}")
    await pg.goto(BASE)
    await pg.wait_for_function("window.NextRoomDebug && typeof activeRooms !== 'undefined' && isPlaying === false", timeout=20000)
    await pg.evaluate(f'window.__dtCap = {dtcap}')
    await pg.wait_for_timeout(800)
    return p, b, ctx, pg
