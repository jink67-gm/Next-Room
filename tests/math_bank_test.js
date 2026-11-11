/* NEXT ROOM V5 — 수학 문제은행 검증 (Node.js)
 * 실행: node tests/math_bank_test.js
 * 1) 모든 단원 × 유형 생성기를 대량 생성해 구조 검사(validateProblem)
 * 2) 생성기가 계산한 정답을 "독립적인 별도 계산"으로 다시 구해 비교 (params 사용)
 * 3) 30문 모드: 단원 하나만 골라도 한 판 안에서 문제 ID·숫자 구성 중복 없음, 고갈 시에도 매개변수형 새 문항
 * 4) 오답이(3개 문) / 다리 문제가 모든 단원 선택에서 생성되는지
 * 5) 쌓기나무: 위·앞·옆·개수로 정답이 하나뿐인지, 그림에 높이가 드러나지 않는지
 * 6) 입력 채점: 2/4 = 1/2 = 0.5 동치 인정, 잘못된 형식 거부
 * 7) 선 잇기: 오른쪽 보기에 계산식 표시 금지, 값 중복 금지
 */
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'js', 'v5-core.js'));
global.NextRoomCore = C;
const B = require(path.join(__dirname, '..', 'assets', 'js', 'math-bank-v5.js'));
let failures = 0;
const fail = m => { failures++; if (failures < 40) console.log('FAIL', m); };

// ---------- independent rational arithmetic (separate from the bank) ----------
const g = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const Q = (n, d = 1) => { const k = g(n, d) || 1; return [n / k, d / k]; };
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
const parse = s => { const m = String(s).match(/^(\d+)\/(\d+)$/); if (m) return Q(+m[1], +m[2]); const d = String(s).match(/^(\d+)\.(\d+)$/); if (d) return Q(+(d[1] + d[2]), 10 ** d[2].length); return Q(+s, 1); };
const PI = { '3': Q(3), '3.1': Q(31, 10), '3.14': Q(314, 100) };
const mul = (a, b) => Q(a[0] * b[0], a[1] * b[1]);

function independentAnswer(p) {
  const P = p.params;
  switch (p.gen) {
    case 'u1_same': return Q(P[0], P[1]);                                   // a/den ÷ b/den = a÷b
    case 'u1_diff': return Q(P[0] * P[3], P[1] * P[2]);                     // a/b ÷ c/d = ad/bc
    case 'u1_nat': return Q(P[0] * P[2], P[1]);                             // n ÷ a/b = nb/a
    case 'u1_mixed': return Q(P[0] * P[2] + P[1], 1);                       // (w r/q) ÷ 1/q = wq+r
    case 'u1_area': return Q(P[0] * P[3], P[1] * P[2]);                     // area ÷ (a/b)
    case 'u2_d1': return Q(P[0], P[1]);                                     // (qc/10) ÷ (c/10) = q
    case 'u2_d2': return Q(P[0], P[1]);
    case 'u2_mix': return Q(P[0], P[1] * 10);                               // (x/100) ÷ (div/10) = x/(10div)
    case 'u2_nat': return Q(P[0] * 10, P[1]);
    case 'u2_round': { const v = P[0] / P[1]; const r = Math.round(v * 10 + 1e-9) / 10; return parse(String(r)); }
    case 'u3_top': return Q(P.reduce((a, b) => a + b, 0));
    case 'u3_front': { const gg = [P.slice(0, 3), P.slice(3, 6), P.slice(6, 9)]; return Q([0, 1, 2].reduce((s, c) => s + Math.max(gg[0][c], gg[1][c], gg[2][c]), 0)); }
    case 'u3_side': { const gg = [P.slice(0, 3), P.slice(3, 6), P.slice(6, 9)]; return Q(gg.reduce((s, row) => s + Math.max(...row), 0)); }
    case 'u3_min': {
      const fv = P.slice(0, 3), sv = P.slice(3, 6); // sv: [front row, middle, back]
      let best = Infinity;
      for (let m = 0; m < 3 ** 9; m++) {
        let x = m; const h = [];
        for (let i = 0; i < 9; i++) { h.push(x % 3 + 1); x = Math.floor(x / 3); }
        const gg = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
        const f = [0, 1, 2].map(c => Math.max(gg[0][c], gg[1][c], gg[2][c]));
        const sd = [gg[2], gg[1], gg[0]].map(r => Math.max(...r));
        if (f.every((v, i) => v === fv[i]) && sd.every((v, i) => v === sv[i])) best = Math.min(best, h.reduce((a, b) => a + b, 0));
      }
      return Q(best);
    }
    case 'u4_prop': { const [a, b, k, pos] = P; return Q([a, b, a * k, b * k][pos]); }
    case 'u4_dist': { const [T, a, b, which] = P; return Q(T * (which ? b : a), a + b); }
    case 'u4_total': { const [a, b, k] = P; return Q((a + b) * k); }
    case 'u5_cd': return mul(Q(P[0]), PI[P[1]]);
    case 'u5_cr': return mul(Q(2 * P[0]), PI[P[1]]);
    case 'u5_ar': return mul(Q(P[0] * P[0]), PI[P[1]]);
    case 'u5_dc': return Q(P[0]);
    case 'u5_ra': return Q(P[0]);
    case 'u6_net': return mul(Q(2 * P[0]), PI[P[2]]);
    case 'u6_cone': return Q(2 * P[0]);
    case 'u6_cyl': return Q(2 * P[0]);
    case 'u6_sph': return Q(P[0] / 2);
    default: return null;
  }
}

// ---------- 1 + 2: bulk generation ----------
const t0 = Date.now();
let generated = 0, checked = 0;
const typeCount = {};
for (const u of [1, 2, 3, 4, 5, 6]) {
  for (const code of Object.keys(B.TYPE_TABLE[u])) {
    for (let i = 0; i < 400; i++) {
      const p = B.generate(u, code, C.makeRng('mt', u, code, i));
      if (!p) continue;
      generated++;
      typeCount[u + code] = (typeCount[u + code] || 0) + 1;
      const errs = B.validateProblem(p);
      if (errs.length) fail(`${u}${code} ${p.gen}: ${errs.join(', ')} :: ${p.q}`);
      if (p.unit !== u) fail('unit mismatch');
      if (p.type === 'typeF_device' || p.type === 'typeE_decoy') {
        const ind = independentAnswer(p);
        if (ind) {
          checked++;
          if (!eq(ind, parse(p.a)) && !(p.a.includes(':'))) fail(`answer mismatch ${p.gen} ${JSON.stringify(p.params)}: bank=${p.a} independent=${ind.join('/')} :: ${p.q}`);
        }
      }
      if (p.type === 'typeB_blank' && p.gen === 'u4_bridge') {
        const [T, a, b] = p.params;
        if (+p.blanks[0].answer + +p.blanks[1].answer !== T || +p.blanks[0].answer * b !== +p.blanks[1].answer * a) fail('bridge split wrong');
      }
      if (p.type === 'typeB_blank' && p.gen === 'u1_blank') {
        const [a, b, c, d] = p.params;
        if (!eq(parse(p.blanks[1].answer), Q(a * d, b * c))) fail('u1 blank result wrong');
      }
      if (p.type === 'typeB_blank' && p.gen === 'u5_blank') {
        const [r, pi] = p.params;
        if (!eq(parse(p.blanks[1].answer), mul(Q(r * r), PI[pi]))) fail('u5 blank area wrong');
      }
      if (p.type === 'typeA_match') {
        p.rightOptions.forEach(o => { if (/[÷×]/.test(o.label)) fail('match right shows expression'); });
        if (new Set(p.rightOptions.map(o => o.label)).size !== 3) fail('match duplicate right');
      }
      if (p.type === 'typeD_voxel') {
        const svgStr = B.renderDiagram(p.diagram);
        // the target diagram must not draw per-cell numbers (heights)
        if (/>\s*[123]\s*<\/text>/.test(svgStr.replace(/모두 \d+개/, ''))) fail('voxel diagram leaks heights');
      }
      if (p.q.length > 70) fail('question too long: ' + p.q);
    }
  }
}
console.log(`generated ${generated} problems across all unit×type, independent answer checks: ${checked}`);

// ---------- 3 + 4: decks ----------
const UNIT_SETS = [[1], [2], [3], [4], [5], [6], [1, 2, 3, 4, 5, 6], [2, 4], [5, 6]];
let decks = 0;
for (const units of UNIT_SETS) {
  for (let s = 0; s < 60; s++) {
    const seed = 900 + s * 31;
    const plan = C.planStage(30, seed);
    const deck = new B.Deck(units, seed);
    const sig = new Set(), num = new Set(), qtext = new Set();
    for (const r of plan.rooms.slice(1)) {
      if (r.puzzle === 'none') continue;
      const p = deck.draw(r.puzzle, r.door);
      if (p.fallback) fail('deck fallback used ' + units);
      if (sig.has(p.sig)) fail('duplicate problem id in one game ' + p.sig);
      if (num.has(p.numSig)) fail('duplicate number composition ' + p.numSig);
      { const key = p.q + JSON.stringify(p.pairs || p.blanks || p.slots || p.decoyChoices || '') + JSON.stringify(p.diagram || '') + JSON.stringify(p.targetGrid || '') + (p.equationTemplate || ''); if (qtext.has(key)) fail('duplicate question text: ' + p.gen + ' ' + p.q); qtext.add(key); }
      sig.add(p.sig); num.add(p.numSig);
      if (!units.includes(p.unit)) fail('unit leak');
      if (r.puzzle === 'decoy' && (p.type !== 'typeE_decoy' || p.decoyChoices.length !== 3)) fail('decoy problem missing for units ' + units);
      if (r.puzzle === 'bridge' && p.deviceType !== 'bridge') fail('bridge problem missing for units ' + units);
    }
    const defSeen = new Set();
    for (let i = 0; i < 25; i++) {
      const d = deck.drawDefense();
      if (!units.includes(d.unit)) fail('defense unit leak');
      if (d.choices.length !== 3 || new Set(d.choices).size !== 3 || d.choices.filter(c => c === d.a).length !== 1) fail('defense choices invalid ' + JSON.stringify(d));
      if (defSeen.has(d.id)) fail('defense repeat within 25 draws');
      defSeen.add(d.id);
    }
    decks++;
  }
}
console.log(`30-door decks simulated: ${decks} (single-unit and multi-unit)`);

// determinism (checkpoint replay)
for (const units of [[3], [1, 2, 3, 4, 5, 6]]) {
  const a = new B.Deck(units, 77), b = new B.Deck(units, 77);
  const plan = C.planStage(30, 77);
  for (const r of plan.rooms.slice(1)) { if (r.puzzle === 'none') continue; if (a.draw(r.puzzle, r.door).sig !== b.draw(r.puzzle, r.door).sig) fail('deck not deterministic'); }
}

// ---------- 5: voxel uniqueness (independent brute force over 1..3) ----------
for (let i = 0; i < 150; i++) {
  const p = B.generate(3, 'D', C.makeRng('vx', i));
  if (!p) continue;
  const cells = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (p.footprint[r][c]) cells.push([r, c]);
  let count = 0;
  for (let m = 0; m < 3 ** cells.length; m++) {
    let x = m; const gg = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; let tot = 0;
    cells.forEach(([r, c]) => { gg[r][c] = x % 3 + 1; tot += gg[r][c]; x = Math.floor(x / 3); });
    if (tot !== p.total) continue;
    const f = [0, 1, 2].map(c => Math.max(gg[0][c], gg[1][c], gg[2][c]));
    const sd = [gg[2], gg[1], gg[0]].map(r => Math.max(...r));
    if (f.every((v, k) => v === p.front[k]) && sd.every((v, k) => v === p.side[k])) count++;
  }
  if (count !== 1) fail('voxel puzzle has ' + count + ' solutions');
}

// ---------- 6: answer checking ----------
const ck = (e, t, want) => { if (B.checkTyped(e, t) !== want) fail(`checkTyped(${e}, ${t}) should be ${want}`); };
ck('1/2', '2/4', true); ck('1/2', '0.5', true); ck('5/2', '2.5', true); ck('12', '12', true); ck('12', '12.0', true);
ck('3.14', '3.140', true); ck('7', '8', false); ck('7/4', '4/7', false); ck('3', '3/0', false); ck('3', '', false); ck('3', 'abc', false);
ck('77.5', '77.5', true); ck('1/3', '0.33', false);

if (failures) { console.log(`FAILED: ${failures}`); process.exit(1); }
console.log('type coverage:', JSON.stringify(typeCount));
console.log(`PASS: math bank verified in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ---------- 8) 옷장 걸쇠(돌풍)·책 꽂기 문제: 글만 보고 풀 수 있고, 보기 3개가 서로 다르고, 정답이 맞는지 ----------
(function defenseCheck() {
  const parse = s => { s = String(s).replace(/\s*(개|cm²|cm)$/, ''); const rr = s.match(/^(\d+) : (\d+)$/); if (rr) return +rr[1] * 1000 + +rr[2]; const m = s.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2]; return parseFloat(s); };
  const evalSide = s => { const m = s.match(/^(\d+)\/(\d+)$/); return m ? +m[1] / +m[2] : parseFloat(s); };
  let n = 0, checked = 0;
  for (const u of [1, 2, 3, 4, 5, 6]) {
    const d = new B.Deck([u], 900 + u);
    const qs = new Set();
    for (let i = 0; i < 400; i++) {
      const p = d.drawDefense(); n++;
      qs.add(p.q);
      if (p.diagram) fail('defense has diagram (unsolvable in latch popup): ' + p.q);
      if (!p.q.startsWith('[')) fail('defense missing unit label ' + p.q);
      if (/위에서 본 모양에 쌓은|그림|\?/.test(p.q)) fail('defense refers to a warden: ' + p.q);
      if (p.q.length > 90) fail('defense too long: ' + p.q);
      if (p.choices.length !== 3 || new Set(p.choices).size !== 3 || !p.choices.includes(p.a)) fail('defense choices ' + JSON.stringify(p));
      const nums = p.choices.map(parse);
      if (nums.every(Number.isFinite) && new Set(nums.map(v => v.toFixed(9))).size !== 3) fail('defense equivalent choices ' + JSON.stringify(p));
      if (p.unit !== u) fail('defense from unselected unit ' + u + ': ' + p.q);
      // 독립 재계산: "A ÷ B = □"
      const m = p.q.match(/\] ([\d./]+) ÷ ([\d./]+) = □$/);
      if (m) { checked++; const v = evalSide(m[1]) / evalSide(m[2]); if (Math.abs(v - parse(p.a)) > 1e-9) fail('defense wrong answer ' + p.q + ' -> ' + p.a); }
      const pr = p.q.match(/\] (\d+|□) : (\d+|□) = (\d+|□) : (\d+|□)$/);
      if (pr) { checked++; const t = pr.slice(1).map(x => x === '□' ? parse(p.a) : +x); if (t[0] * t[3] !== t[1] * t[2]) fail('defense proportion wrong ' + p.q + ' -> ' + p.a); }
      const cu = p.q.match(/가로 (\d+)개, 세로 (\d+)개로 (\d+)층을 쌓은/);
      if (cu) { checked++; if (+cu[1] * +cu[2] * +cu[3] !== parse(p.a)) fail('defense cuboid wrong ' + p.q); }
      const ci = p.q.match(/(지름|반지름) (\d+) cm인 원의 (원주|넓이)는 □ cm²? \(원주율 ([\d.]+)\)/);
      if (ci) { checked++; const r = ci[1] === '지름' ? +ci[2] / 2 : +ci[2], pi = +ci[4]; const v = ci[3] === '원주' ? 2 * r * pi : r * r * pi; if (Math.abs(v - parse(p.a)) > 1e-6) fail('defense circle wrong ' + p.q + ' -> ' + p.a); }
    }
    if (qs.size < 25) fail('defense variety too small for unit ' + u + ': ' + qs.size);
    console.log(`defense unit ${u}: ${qs.size} different questions`);
  }
  console.log(`defense: ${n} drawn, ${checked} independently recomputed`);
  if (failures) { console.log('FAILED', failures); process.exit(1); } else console.log('PASS: closet-latch / shelf-quiz questions solvable without figures, 3 distinct choices, answers verified');
})();
