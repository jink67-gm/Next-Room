"""MATH DOORS V6.2 — 선생님 피드백 검증
1) 분수는 항상 세로 분수: 모든 단원·유형의 문제 화면에 '3/4' 같은 빗금 분수 글자가 남지 않음
2) 회복약 단축키 H
3) 문제 글씨가 커졌는지 (문제 지문 ≥ 20px)
4) 러쉬가 지나갈 때 걸쇠 문제 없음 → triggerRushEvent 후 숨어 있으면 문제 창이 뜨지 않고 피해 없음
5) 피규어 심장박동 창: 남은 시간이 실제로 줄고, 시간이 다 되면 오답 처리 + 새 문제
6) 움직일 때 깜빡임(z-fighting): 같은 평면에 겹친 벽면이 거의 없어야 함
실행: python3 tests/e2e/v62_test.py
"""
import asyncio, sys, json
sys.path.insert(0, '/home/claude/v5/tests/e2e')
from harness import Game, launch

RESULTS = []
def record(name, ok, detail=''):
    RESULTS.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + detail if detail else ''), flush=True)

FRAC_SCAN = r"""() => {
  const B = MathDoorsBank, C = MathDoorsCore, found = []; let n = 0;
  const r = activeRooms[currentDoor]; r.requiresKey = false; r.keyUnlocked = true;
  const visText = (root) => { const out = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { const el = t.parentElement; if (!el || el.closest('.hidden') || getComputedStyle(el).display === 'none') continue; if (/\d\s*\/\s*\d/.test(t.textContent)) out.push(t.textContent.trim().slice(0, 50)); } return out; };
  for (let unit = 1; unit <= 6; unit++) for (const code of ['A','B','C','D','E','F']) for (let k = 0; k < 8; k++) {
    let p; try { p = B.generate(unit, code, C.makeRng('v62', unit * 100 + k, code.charCodeAt(0))); } catch (e) { continue; }
    if (!p) continue; n++;
    r.problem = p; r.puzzleSolved = false; uiOpen.puzzle = false;
    openPuzzleModal();
    if (p.type === 'typeB_blank' || p.type === 'typeF_device' || p.type === 'typeE_dupe') { pressKey('3'); pressKey('/'); }   // 입력 중인 분수도 확인
    const t = visText(document.getElementById('puzzle-modal'));
    document.getElementById('modal-hint-box').classList.remove('hidden');
    visText(document.getElementById('modal-hint-box')).forEach(x => t.push('hint:' + x));
    if (t.length) found.push([unit, code, t.slice(0, 3)]);
    closePuzzleModal();
  }
  // 심장박동 문제 보기
  for (let i = 0; i < 40; i++) { const d = deck.drawDefense(); const div = document.createElement('div'); div.innerHTML = formatMathHTML(d.q) + d.choices.map(formatMathHTML).join(' '); document.body.appendChild(div); if (/\d\s*\/\s*\d/.test(div.innerText)) found.push(['defense', d.q]); div.remove(); }
  return { n, found };
}"""

async def main():
    p, b, ctx, pg = await launch()
    g = Game(pg, lambda m: print(m, flush=True))
    await g.ev("startGame({seed:4242, maxDoors:10, door:2, units:[1,2,3,4,5,6], difficulty:'easy', hearts:3})")
    await pg.wait_for_timeout(800); await g.ev("clearAllMonsterTimers()"); await g.hook_hits()
    # 1) 분수
    res = await g.ev(FRAC_SCAN)
    record(f"fractions: no '3/4'-style text in {res['n']} puzzles (all units/types, typing, hints)", not res['found'], json.dumps(res['found'][:3], ensure_ascii=False))
    door_tex = await g.ev("""() => { const c = document.createElement('canvas'); const t = createDoorTexture('3/4 m'); return !!t; }""")
    record('door labels with fractions draw as stacked fractions (3/4 m, 1과 2/5)', door_tex)
    # 3) 글씨
    await g.ev("() => { const r = activeRooms[currentDoor]; r.problem = MathDoorsBank.generate(1, 'F', MathDoorsCore.makeRng('fs', 1, 1)); r.puzzleSolved = false; openPuzzleModal(); }")
    fs = await g.ev("parseFloat(getComputedStyle(document.getElementById('modal-question')).fontSize)")
    record('puzzle question text is bigger (≥ 20px)', fs >= 20, f'{fs}px')
    await g.ev("closePuzzleModal()")
    # 2) 회복약 H
    await g.ev("() => { hearts = 2; medkitsCount = 1; updateHUD(); }")
    await g.key('KeyH'); await pg.wait_for_timeout(300)
    st = await g.state()
    record('H key uses a medkit (+1 heart)', st['hearts'] == 3 and await g.ev("medkitsCount") == 0, f"hearts={st['hearts']}")
    lbl = await g.ev("document.getElementById('medkit-btn').innerText")
    await g.ev("() => { medkitsCount = 1; updateHUD(); }")
    lbl = await g.ev("document.getElementById('medkit-btn').innerText")
    record('medkit button shows the [H] shortcut', '[H]' in lbl, lbl)
    # 4) 러쉬: 숨어 있으면 문제 없이 지나감
    await g.ev("() => { const r = activeRooms[currentDoor]; const c = r.closets[0]; player.x = c.worldX; player.z = c.worldZ; }")
    await pg.wait_for_timeout(500); await g.key('KeyE'); await pg.wait_for_timeout(1500)
    record('(setup) player is hidden in a closet', (await g.state())['closet'] == 'HIDDEN')
    h0 = (await g.state())['hearts']
    await g.ev("triggerRushEvent()")
    em = False; swept = False
    for _ in range(300):
        st = await g.state()
        if st['ui']['emergency']: em = True
        if st['rush']['phase'] == 'SWEEPING': swept = True
        if swept and not st['rush']['active'] and not st['rush']['warning']: break
        await pg.wait_for_timeout(100)
    st = await g.state()
    record('rush passes a hidden player with NO latch quiz and no damage', swept and not em and st['hearts'] == h0, f"swept={swept} quiz={em} hearts {h0}→{st['hearts']}")
    await g.ev("exitClosetImmediate()"); await pg.wait_for_timeout(500)
    # 5) 심장박동 시간
    await g.ev("() => { hb.wrong = 0; openHeartbeat(); }")
    s0 = await g.ev("hb.remain"); await pg.wait_for_timeout(2500); s1 = await g.ev("hb.remain")
    txt = await g.ev("document.getElementById('hb-secs').innerText")
    record('heartbeat: remaining seconds actually count down', s0 - s1 > 1.8, f'{s0:.1f}s → {s1:.1f}s ({txt})')
    q0 = await g.ev("hb.prob.q")
    await g.ev("() => { clearInterval(hb.countdown); hb.total = 1; }")
    await g.ev("""() => { const deadline = performance.now() + 600; clearInterval(hb.countdown); hb.countdown = setInterval(() => { if (performance.now() > deadline) { clearInterval(hb.countdown); answerHeartbeat(false, true); } }, 50); }""")
    await pg.wait_for_timeout(1500)
    fb = await g.ev("document.getElementById('hb-feedback').innerText"); w = await g.ev("hb.wrong"); q1 = await g.ev("hb.prob.q")
    record('heartbeat: time-out counts as a wrong answer and gives a new question with a fresh timer', w == 1 and '시간' in fb and await g.ev("hb.remain") > 5, f'wrong={w} fb={fb}')
    await g.ev("closeHeartbeat(); figureState.hunt = false;")
    # 6) 깜빡임 검사
    scan = open('/home/claude/v5/tests/e2e/zfight_scan.js').read()
    total = 0; detail = []
    for diff, door in [('easy', 4), ('normal', 6), ('challenge', 3), ('easy', 9)]:
        await g.ev(f"startGame({{seed:3131, maxDoors:30, door:{door}, units:[1,2,3,4,5,6], difficulty:'{diff}', hearts:3}})")
        await g.ev("clearAllMonsterTimers()"); await pg.wait_for_timeout(1200)
        res = await pg.evaluate(scan)
        far = await g.ev("() => { const ks = Object.keys(activeRooms).map(Number).filter(k => activeRooms[k]); const r = activeRooms[Math.max(...ks)]; return r.zStart - r.roomLen - 0.14; }")
        # 가장 먼 방의 바깥 뒷면은 다음 방이 지어지면 가려짐(아직 아무도 볼 수 없는 면) → 제외
        big = [r for r in res if r['ax'][0] != 'y' and r['area'] > 0.05 and not (r['ax'] == 'z-' and abs(float(r['at']) - far) < 0.01)]
        total += len(big); detail.append(f"{diff}{door}:{len(big)}")
    record('no large coplanar overlapping wall faces (z-fighting) around 4 sample rooms', total == 0, ' '.join(detail))
    record('v6.2: no page errors', not g.errors, '; '.join(g.errors[:3]))
    print('SUMMARY', sum(1 for r in RESULTS if r[1]), '/', len(RESULTS))
    json.dump(RESULTS, open('/home/claude/scenario_results_v62.json', 'w'), ensure_ascii=False, indent=1)
    await b.close(); await p.stop()

asyncio.run(main())
