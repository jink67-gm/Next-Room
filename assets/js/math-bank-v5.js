/* MATH DOORS V5 — 6학년 2학기 수학 문제은행 (매개변수형 생성기 + 검증)
 * 단원: ① 분수의 나눗셈 ② 소수의 나눗셈 ③ 공간과 입체 ④ 비례식과 비례배분 ⑤ 원의 둘레와 넓이 ⑥ 원기둥·원뿔·구
 * - 모든 문항은 시드 기반으로 생성되어 같은 시드·같은 순서면 같은 문제가 나온다(체크포인트 복원용).
 * - 한 판 안에서 문제 ID(sig)와 숫자 구성(numSig)이 겹치지 않게 출제한다.
 * - 정답은 유리수(분자/분모)로 계산해 부동소수 오차가 없다.
 */
(function (root) {
  'use strict';
  const Core = root.MathDoorsCore || (typeof require !== 'undefined' ? require('./v5-core.js') : null);
  const makeRng = Core.makeRng;

  const UNIT_NAMES = {
    1: '1단원. 분수의 나눗셈', 2: '2단원. 소수의 나눗셈', 3: '3단원. 공간과 입체',
    4: '4단원. 비례식과 비례배분', 5: '5단원. 원의 둘레와 넓이', 6: '6단원. 원기둥, 원뿔, 구'
  };

  // ---------------------------------------------------------------- rational
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  function R(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
  const rMul = (a, b) => R(a.n * b.n, a.d * b.d);
  const rDiv = (a, b) => R(a.n * b.d, a.d * b.n);
  const rAdd = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d);
  const rSub = (a, b) => R(a.n * b.d - b.n * a.d, a.d * b.d);
  const rEq = (a, b) => a && b && a.n === b.n && a.d === b.d;
  const isInt = a => a.d === 1;
  function terminates(a) { let d = a.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
  function decStr(a) { // exact decimal string for terminating rationals (falls back to fraction)
    if (isInt(a)) return String(a.n);
    if (!terminates(a)) return fracStr(a);
    let places = 1;
    while ((10 ** places) % a.d !== 0 && places < 10) places++;
    const v = a.n * ((10 ** places) / a.d);
    const neg = v < 0;
    let s = String(Math.abs(v)).padStart(places + 1, '0');
    s = s.slice(0, s.length - places) + '.' + s.slice(s.length - places);
    s = s.replace(/0+$/, '').replace(/\.$/, '');
    return (neg ? '-' : '') + s;
  }
  function fracStr(a) { return isInt(a) ? String(a.n) : a.n + '/' + a.d; }
  function mixedStr(a) { if (isInt(a) || a.n < a.d) return fracStr(a); const w = Math.floor(a.n / a.d), r = a.n - w * a.d; return r ? w + '과 ' + r + '/' + a.d : String(w); }
  // value display: decimals for unit 2/5, fractions elsewhere
  function show(a, mode) { if (mode === 'dec' && terminates(a)) return decStr(a); return fracStr(a); }
  function parseNum(str) {
    if (str === null || str === undefined) return null;
    let s = String(str).replace(/\s+/g, '').replace(/,/g, '');
    if (!s) return null;
    let m = s.match(/^(\d+)과(\d+)\/(\d+)$/);
    if (m) { const den = +m[3]; if (!den) return null; return R(+m[1] * den + +m[2], den); }
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) { if (+m[2] === 0) return null; return R(+m[1], +m[2]); }
    m = s.match(/^(\d*)\.(\d+)$/);
    if (m) { const p = m[2].length; return R(+(m[1] || '0') * 10 ** p + +m[2], 10 ** p); }
    m = s.match(/^\d+$/);
    if (m) return R(+s, 1);
    return null;
  }
  // decimal from integer scaled
  const D = (scaled, places) => R(scaled, 10 ** places);

  // ------------------------------------------------------------- distractors
  function numChoices(rng, ans, cands, mode) {
    const out = [ans];
    const pushIf = v => { if (!v || v.n <= 0) return; if (out.some(o => rEq(o, v))) return; out.push(v); };
    rng.shuffle(cands).forEach(pushIf);
    let k = 1;
    while (out.length < 3 && k < 20) { pushIf(rAdd(ans, R(k, isInt(ans) ? 1 : ans.d))); if (out.length < 3) pushIf(rSub(ans, R(k, isInt(ans) ? 1 : ans.d))); k++; }
    return rng.shuffle(out.slice(0, 3)).map(v => show(v, mode));
  }
  function textChoices(rng, ans, cands) {
    const out = [ans];
    rng.shuffle(cands).forEach(c => { if (out.length < 3 && c && !out.includes(c)) out.push(c); });
    return rng.shuffle(out);
  }

  // --------------------------------------------------------------- builders
  function base(unit, gen, params, extra) {
    return Object.assign({ unit, unitName: UNIT_NAMES[unit], gen, params, sig: gen + ':' + JSON.stringify(params) }, extra);
  }
  function asNumeric(core, opts) {
    // core: {unit, gen, params, q, hint, ans (rational), mode, unitLabel, distract:[rationals], diagram}
    const t = opts.type;
    const a = show(core.ans, core.mode);
    const p = base(core.unit, core.gen, core.params, { q: core.q, hint: core.hint, diagram: core.diagram || null, ans: core.ans, mode: core.mode || 'frac', unitLabel: core.unitLabel || '' });
    if (t === 'E') {
      p.type = 'typeE_dupe'; p.a = a;
      p.dupeChoices = numChoices(opts.rng, core.ans, core.distract || [], core.mode);
      p.q = core.q + (core.unitLabel && !core.q.includes(core.unitLabel) ? ' (단위: ' + core.unitLabel + ')' : '');
    } else {
      p.type = 'typeF_device'; p.a = a; p.deviceType = opts.device || core.device || 'gear';
    }
    return p;
  }

  // ================================================================ UNIT 1
  const U1 = {};
  U1.core = function (rng, variant) {
    const v = variant != null ? variant : rng.int(0, 4);
    if (v === 0) { // same denominator
      const den = rng.int(5, 13), b = rng.int(1, 4);
      const multiple = rng.chance(0.6);
      let a;
      if (multiple) { const k = rng.int(2, Math.max(2, Math.floor((den - 1) / b))); a = b * k; }
      else { a = rng.int(b + 1, den - 1); if (a % b === 0) a++; }
      if (a >= den || gcd(a, den) !== 1 && gcd(b, den) !== 1) return null;
      if (gcd(a, den) !== 1 || gcd(b, den) !== 1) return null;
      const ans = R(a, b);
      return { unit: 1, gen: 'u1_same', params: [a, b, den], q: `${a}/${den} ÷ ${b}/${den} = □`, hint: '분모가 같으면 분자끼리 나눕니다.', ans, distract: [R(a * b, den * den), R(b, a), R(a - b, 1)] };
    }
    if (v === 1) { // different denominators
      const b = rng.int(2, 9), d = rng.int(2, 9);
      if (b === d) return null;
      const a = rng.int(1, b - 1), c = rng.int(1, d - 1);
      if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
      const ans = rDiv(R(a, b), R(c, d));
      if (ans.n > 40 || ans.d > 20) return null;
      return { unit: 1, gen: 'u1_diff', params: [a, b, c, d], q: `${a}/${b} ÷ ${c}/${d} = □`, hint: `나누는 수 ${c}/${d}의 분모와 분자를 바꾸어 곱합니다.`, ans, distract: [rMul(R(a, b), R(c, d)), rDiv(R(c, d), R(a, b)), R(a * c, b * d)] };
    }
    if (v === 2) { // natural ÷ fraction
      const b = rng.int(2, 9), a = rng.int(1, b - 1);
      if (gcd(a, b) !== 1) return null;
      const n = a * rng.int(1, 6);
      const ans = rDiv(R(n, 1), R(a, b));
      if (ans.n > 60) return null;
      return { unit: 1, gen: 'u1_nat', params: [n, a, b], q: `${n} ÷ ${a}/${b} = □`, hint: `${n} × ${b}/${a} 로 바꾸어 계산해 보세요.`, ans, distract: [R(n * a, b), R(n, b), rAdd(ans, R(b, 1))] };
    }
    if (v === 3) { // mixed ÷ fraction (word problem)
      const q = rng.pick([2, 3, 4, 5, 6, 8]), w = rng.int(1, 3), r = rng.int(1, q - 1);
      if (gcd(r, q) !== 1) return null;
      const total = R(w * q + r, q);
      const ans = rDiv(total, R(1, q));
      return { unit: 1, gen: 'u1_mixed', params: [w, r, q], q: `주스 ${w}과 ${r}/${q} L를 한 병에 1/${q} L씩 나누어 담으면 모두 몇 병이 될까요? □병`, hint: `대분수를 가분수 ${w * q + r}/${q} 로 바꾸어 보세요.`, ans, unitLabel: '병', distract: [R(w * q, 1), R(w + r, 1), R(w * r + q, 1)] };
    }
    // area ÷ side
    const b = rng.int(2, 8), a = rng.int(1, b - 1);
    const p = rng.int(2, 9), q = rng.int(2, 7);
    if (gcd(a, b) !== 1 || gcd(p, q) !== 1) return null;
    const area = rMul(R(a, b), R(p, q));
    if (area.d > 60 || isInt(area)) return null;
    const ans = R(p, q);
    return { unit: 1, gen: 'u1_area', params: [area.n, area.d, a, b], q: `넓이가 ${fracStr(area)} m²이고 세로가 ${a}/${b} m인 직사각형이 있습니다. 가로는 몇 m일까요? □ m`, hint: '(가로) = (넓이) ÷ (세로)', ans, unitLabel: 'm', distract: [rMul(area, R(a, b)), rDiv(R(a, b), area), rAdd(ans, R(1, 1))], diagram: { kind: 'rectFrac', area: fracStr(area), side: `${a}/${b}` } };
  };
  U1.blank = function (rng) {
    const b = rng.int(2, 9), d = rng.int(2, 9);
    if (b === d) return null;
    const a = rng.int(1, b - 1), c = rng.int(2, d - 1);
    if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
    const ans = rDiv(R(a, b), R(c, d));
    return base(1, 'u1_blank', [a, b, c, d], {
      type: 'typeB_blank', q: '나눗셈을 곱셈으로 바꾸어 계산하세요.', hint: '나누는 분수의 분모와 분자를 바꿉니다.',
      equationTemplate: `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/①  = ②`,
      blanks: [{ label: '① 나누는 수를 뒤집은 분수의 분모', answer: String(c), ans: R(c, 1) }, { label: '② 계산 결과', answer: fracStr(ans), ans }]
    });
  };
  // ================================================================ UNIT 2
  const U2 = {};
  U2.core = function (rng, variant) {
    const v = variant != null ? variant : rng.int(0, 4);
    if (v === 0) { // x.y ÷ 0.c = integer
      const c = rng.int(2, 9), q = rng.int(3, 19);
      const dividend = D(q * c, 1);
      if (isInt(dividend)) return null;
      return { unit: 2, gen: 'u2_d1', params: [q * c, c], q: `${decStr(dividend)} ÷ 0.${c} = □`, hint: '두 수의 소수점을 오른쪽으로 한 자리씩 옮깁니다.', ans: R(q, 1), mode: 'dec', distract: [D(q, 1), R(q * 10, 1), R(q + 1, 1)] };
    }
    if (v === 1) { // two decimal places
      const ab = rng.int(12, 95), q = rng.int(2, 15);
      if (ab % 10 === 0) return null;
      const dividend = D(q * ab, 2);
      if (isInt(dividend)) return null;
      return { unit: 2, gen: 'u2_d2', params: [q * ab, ab], q: `${decStr(dividend)} ÷ ${decStr(D(ab, 2))} = □`, hint: '소수점을 오른쪽으로 두 자리씩 옮겨 자연수의 나눗셈으로 바꿉니다.', ans: R(q, 1), mode: 'dec', distract: [D(q, 1), R(q * 10, 1), R(q + 2, 1)] };
    }
    if (v === 2) { // mixed places: 4.56 ÷ 1.2 = 3.8
      const div = rng.int(11, 39), qq = rng.int(12, 59);
      if (div % 10 === 0 || qq % 10 === 0) return null;
      const dividend = D(div * qq, 2);
      return { unit: 2, gen: 'u2_mix', params: [div * qq, div], q: `${decStr(dividend)} ÷ ${decStr(D(div, 1))} = □`, hint: '나누는 수가 자연수가 되도록 두 수의 소수점을 똑같이 한 자리 옮깁니다.', ans: D(qq, 1), mode: 'dec', distract: [D(qq, 2), R(qq, 1), D(qq + 10, 1)] };
    }
    if (v === 3) { // natural ÷ decimal
      const c = rng.pick([2, 4, 5, 6, 8]), q = rng.int(2, 9) * (c === 5 ? 2 : 5);
      const n = q * c / 10;
      if (!Number.isInteger(n) || n < 2) return null;
      return { unit: 2, gen: 'u2_nat', params: [n, c], q: `${n} ÷ 0.${c} = □`, hint: '자연수 뒤에 .0을 붙여 생각하고 소수점을 한 자리씩 옮깁니다.', ans: R(q, 1), mode: 'dec', distract: [D(q, 1), R(q * 10, 1), R(n * c, 1)] };
    }
    // rounding the quotient
    const a = rng.int(5, 29), b = rng.pick([3, 6, 7, 9, 11]);
    if (a % b === 0) return null;
    const exact = R(a, b);
    if (terminates(exact) && String(decStr(exact)).split('.')[1] && decStr(exact).split('.')[1].length <= 1) return null;
    const scaled = R(exact.n * 10, exact.d);
    const fl = Math.floor(scaled.n / scaled.d);
    const rem = R(scaled.n - fl * scaled.d, scaled.d);
    const up = rem.n * 2 >= rem.d;
    const ans = D(up ? fl + 1 : fl, 1);
    return { unit: 2, gen: 'u2_round', params: [a, b], q: `${a} ÷ ${b}의 몫을 반올림하여 소수 첫째 자리까지 나타내면 □입니다.`, hint: '몫을 소수 둘째 자리까지 구한 뒤 둘째 자리에서 반올림합니다.', ans, mode: 'dec', distract: [D(up ? fl : fl + 1, 1), D(fl, 2), R(Math.floor(a / b), 1)] };
  };
  U2.blank = function (rng) {
    if (rng.chance(0.5)) {
      const ab = rng.int(12, 95), q = rng.int(3, 25);
      if (ab % 10 === 0) return null;
      const big = q * ab;
      return base(2, 'u2_blank_shift', [big, ab], {
        type: 'typeB_blank', q: '소수점을 똑같이 옮겨 계산하세요.', hint: '두 수의 소수점을 오른쪽으로 두 자리씩 옮깁니다.',
        equationTemplate: `${decStr(D(big, 2))} ÷ ${decStr(D(ab, 2))} = ① ÷ ${ab} = ②`,
        blanks: [{ label: '① 소수점을 옮긴 뒤의 나누어지는 수', answer: String(big), ans: R(big, 1) }, { label: '② 몫', answer: String(q), ans: R(q, 1) }]
      });
    }
    // 나누어 주고 남는 양
    const n = rng.int(2, 4), q = rng.int(2, 6), remS = rng.int(1, n * 10 - 1);
    if (remS % 10 === 0) return null;
    const total = D(n * q * 10 + remS, 1);
    return base(2, 'u2_blank_rem', [n * q * 10 + remS, n], {
      type: 'typeB_blank', q: `쌀 ${decStr(total)} kg을 한 봉지에 ${n} kg씩 담습니다. 담을 수 있는 봉지 수와 남는 쌀의 양을 구하세요.`, hint: '몫은 자연수까지만 구하고, 남는 양 = 전체 − (몫 × 한 봉지)',
      equationTemplate: `${decStr(total)} ÷ ${n} → 봉지 ① 개, 남는 양 ② kg`,
      blanks: [{ label: '① 담을 수 있는 봉지 수', answer: String(q), ans: R(q, 1) }, { label: '② 남는 양 (kg)', answer: decStr(D(remS, 1)), ans: D(remS, 1) }]
    });
  };

  // ================================================================ UNIT 3
  function randomHeights(rng, minCells) {
    for (let t = 0; t < 50; t++) {
      const g = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      let cells = 0;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { if (rng.chance(0.75)) { g[r][c] = rng.int(1, 3); cells++; } }
      if (cells >= (minCells || 5)) return g;
    }
    return [[1, 2, 1], [2, 3, 1], [1, 1, 2]];
  }
  // grid rows: 0 = back(뒤), 2 = front(앞) ; cols: 0 = left
  function frontView(g) { return [0, 1, 2].map(c => Math.max(g[0][c], g[1][c], g[2][c])); }
  function sideView(g) { return [2, 1, 0].map(r => Math.max(g[r][0], g[r][1], g[r][2])); } // seen from the right: left = 앞
  const total = g => g.flat().reduce((a, b) => a + b, 0);
  function countSolutions(fp, fv, sv, tot, limit) {
    // brute force: heights 1..3 on footprint cells
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (fp[r][c]) cells.push([r, c]);
    let count = 0; const g = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let found = null;
    const rec = (i, sum) => {
      if (count > limit) return;
      if (sum > tot) return;
      if (i === cells.length) {
        if (sum !== tot) return;
        const f = frontView(g), s = sideView(g);
        if (f.every((v, k) => v === fv[k]) && s.every((v, k) => v === sv[k])) { count++; found = g.map(r => r.slice()); }
        return;
      }
      const [r, c] = cells[i];
      for (let h = 1; h <= 3; h++) { g[r][c] = h; rec(i + 1, sum + h); }
      g[r][c] = 0;
    };
    rec(0, 0);
    return { count, found };
  }
  function minMaxCount(fp, fv, sv) {
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (fp[r][c]) cells.push([r, c]);
    let mn = Infinity, mx = -Infinity; const g = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const rec = (i, sum) => {
      if (i === cells.length) {
        const f = frontView(g), s = sideView(g);
        if (f.every((v, k) => v === fv[k]) && s.every((v, k) => v === sv[k])) { mn = Math.min(mn, sum); mx = Math.max(mx, sum); }
        return;
      }
      const [r, c] = cells[i];
      for (let h = 1; h <= 3; h++) { g[r][c] = h; rec(i + 1, sum + h); }
      g[r][c] = 0;
    };
    rec(0, 0);
    return { mn, mx };
  }
  const U3 = {};
  U3.core = function (rng, variant) {
    const v = variant != null ? variant : rng.int(0, 3);
    if (v === 0) { // total from top view numbers
      const g = randomHeights(rng, 5);
      const ans = R(total(g), 1);
      const cells = g.flat().filter(x => x > 0).length;
      return { unit: 3, gen: 'u3_top', params: g.flat(), q: '그림은 위에서 본 모양이고, 각 칸의 수는 그 자리에 쌓은 쌓기나무 개수입니다. 쌓기나무는 모두 몇 개일까요? □개', hint: '각 칸에 적힌 수를 모두 더합니다.', ans, unitLabel: '개', distract: [R(cells, 1), rAdd(ans, R(1, 1)), rSub(ans, R(1, 1))], diagram: { kind: 'topNumbers', grid: g } };
    }
    if (v === 1) { // squares seen from front
      const g = randomHeights(rng, 5);
      const fv = frontView(g);
      const ans = R(fv.reduce((a, b) => a + b, 0), 1);
      return { unit: 3, gen: 'u3_front', params: g.flat(), q: '그림은 위에서 본 모양이고, 각 칸의 수는 쌓은 개수입니다. 앞에서 보면 정사각형 면이 모두 몇 개 보일까요? □개', hint: '앞에서 보면 세로줄마다 가장 높은 층만큼 보입니다.', ans, unitLabel: '개', distract: [R(total(g), 1), rAdd(ans, R(2, 1)), rSub(ans, R(1, 1))], diagram: { kind: 'topNumbers', grid: g, arrow: 'front' } };
    }
    if (v === 2) { // squares seen from right side
      const g = randomHeights(rng, 5);
      const sv = sideView(g);
      const ans = R(sv.reduce((a, b) => a + b, 0), 1);
      return { unit: 3, gen: 'u3_side', params: g.flat(), q: '그림은 위에서 본 모양이고, 각 칸의 수는 쌓은 개수입니다. 오른쪽 옆에서 보면 정사각형 면이 모두 몇 개 보일까요? □개', hint: '옆에서 보면 가로줄마다 가장 높은 층만큼 보입니다.', ans, unitLabel: '개', distract: [R(total(g), 1), R(frontView(g).reduce((a, b) => a + b, 0) === ans.n ? ans.n + 2 : frontView(g).reduce((a, b) => a + b, 0), 1), rAdd(ans, R(1, 1))], diagram: { kind: 'topNumbers', grid: g, arrow: 'side' } };
    }
    // minimum number (footprint all filled), from front & side views
    for (let t = 0; t < 30; t++) {
      const fv = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)], sv = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
      if (Math.max(...fv) !== Math.max(...sv)) continue;
      const fp = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
      const { mn, mx } = minMaxCount(fp, fv, sv);
      if (!isFinite(mn) || mn === mx) continue;
      return { unit: 3, gen: 'u3_min', params: fv.concat(sv), q: '위에서 본 9칸에 모두 쌓았고, 앞·옆에서 본 모양은 그림과 같습니다. 가장 적게 쌓으면 몇 개일까요? □개', hint: '앞·옆 모양을 동시에 만족하는 가장 작은 높이를 각 칸에 정해 보세요.', ans: R(mn, 1), unitLabel: '개', distract: [R(mx, 1), R(mn + 1, 1), R(9, 1)], diagram: { kind: 'views', front: fv, side: sv, footprint: fp } };
    }
    return null;
  };
  U3.voxel = function (rng) {
    for (let t = 0; t < 120; t++) {
      const g = randomHeights(rng, 5);
      const fp = g.map(r => r.map(h => (h > 0 ? 1 : 0)));
      const fv = frontView(g), sv = sideView(g), tot = total(g);
      const sol = countSolutions(fp, fv, sv, tot, 2);
      if (sol.count !== 1) continue;
      // avoid trivial: every visible max equals each cell height (all 3s etc.)
      if (g.flat().every(h => h === 0 || h === 3)) continue;
      return base(3, 'u3_voxel', g.flat(), {
        type: 'typeD_voxel', q: `위·앞·옆 모양을 보고 쌓기나무 ${tot}개로 똑같이 쌓으세요.`,
        hint: '앞 모양은 세로줄, 옆 모양은 가로줄의 가장 높은 층입니다. 확실한 칸부터 정하세요.',
        footprint: fp, front: fv, side: sv, total: tot, targetGrid: g, diagram: { kind: 'voxelTarget', footprint: fp, front: fv, side: sv, total: tot }, device: 'voxel'
      });
    }
    return null;
  };
  U3.match = function (rng) {
    const items = [];
    const used = new Set();
    for (let t = 0; t < 40 && items.length < 3; t++) {
      const a = rng.int(2, 4), b = rng.int(2, 4), c = rng.int(1, 3);
      const v = a * b * c;
      if (used.has(v)) continue;
      used.add(v);
      items.push({ left: `가로 ${a}줄 · 세로 ${b}줄 · ${c}층 직육면체`, right: `${v}개`, p: [a, b, c] });
    }
    if (items.length < 3) return null;
    return matchFrom(3, 'u3_match', items, '직육면체 모양으로 쌓은 쌓기나무 개수를 연결하세요.', '(가로 줄 수) × (세로 줄 수) × (층 수)');
  };

  // ================================================================ UNIT 4
  const U4 = {};
  function coprimePair(rng, lo, hi) { for (let t = 0; t < 30; t++) { const a = rng.int(lo, hi), b = rng.int(lo, hi); if (a !== b && gcd(a, b) === 1) return [a, b]; } return [2, 3]; }
  U4.core = function (rng, variant) {
    const v = variant != null ? variant : rng.int(0, 2);
    if (v === 0) { // a : b = c : □ (position varies)
      const [a, b] = coprimePair(rng, 2, 9), k = rng.int(2, 7);
      const pos = rng.int(0, 3);
      const vals = [a, b, a * k, b * k];
      const ans = R(vals[pos], 1);
      const shownVals = vals.map((x, i) => (i === pos ? '□' : String(x)));
      const q = `${shownVals[0]} : ${shownVals[1]} = ${shownVals[2]} : ${shownVals[3]}`;
      const wrongAdd = pos === 3 ? R(a * k + (b - a), 1) : R(vals[pos] + 1, 1);
      return { unit: 4, gen: 'u4_prop', params: [a, b, k, pos], q: `비례식 ${q} 에서 □에 알맞은 수는?`, hint: '외항의 곱과 내항의 곱은 같습니다.', ans, distract: [wrongAdd, R(vals[pos] * 2, 1), R(Math.max(1, vals[pos] - 1), 1)], diagram: { kind: 'proportion', text: q } };
    }
    if (v === 1) { // 비례배분
      const [a, b] = coprimePair(rng, 1, 7), k = rng.int(3, 12);
      const T = (a + b) * k;
      const forFirst = rng.chance(0.5);
      const ans = R((forFirst ? a : b) * k, 1);
      return { unit: 4, gen: 'u4_dist', params: [T, a, b, forFirst ? 0 : 1], q: (() => { const nm = [['형과 동생이', '형은', '동생은'], ['언니와 동생이', '언니는', '동생은'], ['민지와 준호가', '민지는', '준호는'], ['1반과 2반이', '1반은', '2반은']][T % 4]; return `구슬 ${T}개를 ${nm[0]} ${a} : ${b}로 나누어 가지면 ${forFirst ? nm[1] : nm[2]} 몇 개를 가질까요? □개`; })(), unitLabel: '개', hint: `전체를 ${a} + ${b} = ${a + b} 칸으로 나눈 것 중 ${forFirst ? a : b} 칸입니다.`, ans, distract: [R((forFirst ? b : a) * k, 1), R(Math.round(T / 2), 1), rAdd(ans, R(k, 1))] };
    }
    // a : b with total & ratio (cookie problem) — find total from one part
    const [a, b] = coprimePair(rng, 2, 7), k = rng.int(2, 9);
    const ans = R((a + b) * k, 1);
    return { unit: 4, gen: 'u4_total', params: [a, b, k], q: `민지와 준호의 구슬 수의 비는 ${a} : ${b}입니다. 민지의 구슬이 ${a * k}개라면 두 사람의 구슬은 모두 몇 개일까요? □개`, hint: `민지의 몫 ${a}칸이 ${a * k}개이므로 한 칸은 ${k}개입니다. 전체는 ${a} + ${b} = ${a + b}칸입니다.`, ans, unitLabel: '개', distract: [R(b * k, 1), R(a * k + b, 1), R((a + b) * k + k, 1)] };
  };
  U4.simplest = function (rng) {
    const kind = rng.int(0, 2);
    const [a, b] = coprimePair(rng, 1, 9);
    if (kind === 0) { const k = rng.int(2, 9); return { left: `${a * k} : ${b * k}`, right: `${a} : ${b}`, p: ['i', a, b, k] }; }
    if (kind === 1) { if (a * b > 0 && (a > 9 || b > 9)) return null; const s = rng.pick([1, 2, 3]); const l = `${decStr(D(a * s, 1))} : ${decStr(D(b * s, 1))}`; if (a * s >= 10 && b * s >= 10 && (a * s) % 10 === 0) return null; return { left: l, right: `${a} : ${b}`, p: ['d', a, b, s] }; }
    // 1/x : 1/y = y : x
    const x = rng.int(2, 6), y = rng.int(2, 6);
    if (x === y) return null;
    const g = gcd(x, y);
    return { left: `1/${x} : 1/${y}`, right: `${y / g} : ${x / g}`, p: ['f', x, y] };
  };
  U4.match = function (rng) {
    const items = []; const rights = new Set(); const lefts = new Set();
    for (let t = 0; t < 60 && items.length < 3; t++) {
      const it = U4.simplest(rng);
      if (!it || rights.has(it.right) || lefts.has(it.left) || it.left === it.right) continue;
      rights.add(it.right); lefts.add(it.left); items.push(it);
    }
    if (items.length < 3) return null;
    return matchFrom(4, 'u4_match', items, '가장 간단한 자연수의 비와 연결하세요.', '전항과 후항에 같은 수를 곱하거나 나누어 봅니다.');
  };
  U4.dupeRatio = function (rng) {
    const [a, b] = coprimePair(rng, 2, 9), k = rng.int(2, 5);
    const ans = `${a * k} : ${b * k}`;
    const choices = textChoices(rng, ans, [`${a + k} : ${b + k}`, `${b * k} : ${a * k}`, `${a * k} : ${b + k}`]);
    return base(4, 'u4_equiv', [a, b, k], { type: 'typeE_dupe', q: `${a} : ${b}의 비율과 같은 비가 적힌 문은?`, hint: '전항과 후항에 0이 아닌 같은 수를 곱해도 비율은 같습니다.', a: ans, dupeChoices: choices });
  };
  U4.bridge = function (rng) {
    const [a, b] = coprimePair(rng, 1, 7), k = rng.int(2, 6);
    const T = (a + b) * k;
    return base(4, 'u4_bridge', [T, a, b], {
      type: 'typeB_blank', deviceType: 'bridge', bridgeSplit: { total: T, ratio: [a, b] },
      q: `다리 ${T} m를 ${a} : ${b}의 비로 나누어 두 판을 놓습니다.`, hint: `${T} m를 ${a + b}칸으로 나누면 한 칸은 ${k} m입니다.`,
      equationTemplate: `${T} m → 앞판 ① m : 뒤판 ② m = ${a} : ${b}`,
      blanks: [{ label: '① 앞판 길이 (m)', answer: String(a * k), ans: R(a * k, 1) }, { label: '② 뒤판 길이 (m)', answer: String(b * k), ans: R(b * k, 1) }],
      diagram: { kind: 'bridge', total: T, ratio: [a, b] }
    });
  };
  U4.blank = function (rng) {
    const [a, b] = coprimePair(rng, 2, 9), k = rng.int(2, 6);
    const c = a * k, x = b * k;
    return base(4, 'u4_blank', [a, b, k], {
      type: 'typeB_blank', q: `비례식 ${a} : ${b} = ${c} : □ 를 풀어 보세요.`, hint: '내항의 곱 = 외항의 곱',
      equationTemplate: `내항의 곱 ${b} × ${c} = ①  →  ${a} × □ = ①  →  □ = ②`,
      blanks: [{ label: '① 내항의 곱', answer: String(b * c), ans: R(b * c, 1) }, { label: '② □의 값', answer: String(x), ans: R(x, 1) }],
      diagram: { kind: 'proportion', text: `${a} : ${b} = ${c} : □`, showProducts: true }
    });
  };
  U4.cards = function (rng) {
    const [a, b] = coprimePair(rng, 1, 7), k = rng.int(3, 9);
    const T = (a + b) * k;
    const A = `${a * k}`, B = `${b * k}`;
    const cards = rng.shuffle([A, B, String(Math.round(T / 2) === a * k || Math.round(T / 2) === b * k ? T - 1 : Math.round(T / 2)), String(a * k + b)].filter((v, i, arr) => arr.indexOf(v) === i));
    if (cards.length < 4) return null;
    return base(4, 'u4_cards', [T, a, b], {
      type: 'typeC_drag', q: `사탕 ${T}개를 가 모둠과 나 모둠에게 ${a} : ${b}로 나누어 줍니다. 각 모둠이 받는 개수를 카드에서 골라 놓으세요.`, hint: `전체 ${a + b}칸 중 가 모둠은 ${a}칸, 나 모둠은 ${b}칸입니다.`,
      slots: [{ label: '가 모둠이 받는 개수', answer: A }, { label: '나 모둠이 받는 개수', answer: B }], cards
    });
  };

  // ================================================================ UNIT 5
  const PIS = [{ v: R(3, 1), s: '3' }, { v: R(31, 10), s: '3.1' }, { v: R(314, 100), s: '3.14' }];
  const U5 = {};
  U5.core = function (rng, variant) {
    const v = variant != null ? variant : rng.int(0, 4);
    const pi = rng.pick(PIS);
    if (v === 0) { // circumference from diameter
      const d = rng.int(3, 20);
      const ans = rMul(R(d, 1), pi.v);
      return { unit: 5, gen: 'u5_cd', params: [d, pi.s], q: `지름 ${d} cm인 원의 원주는 □ cm (원주율 ${pi.s})`, hint: '(원주) = (지름) × (원주율)', ans, mode: 'dec', unitLabel: 'cm', distract: [rMul(R(d * 2, 1), pi.v), rMul(R(d * d, 4), pi.v), rAdd(ans, pi.v)], diagram: { kind: 'circle', label: `지름 ${d} cm`, mode: 'diameter', pi: pi.s, ask: '원주 = ? cm' } };
    }
    if (v === 1) { // circumference from radius
      const r = rng.int(2, 12);
      const ans = rMul(R(2 * r, 1), pi.v);
      return { unit: 5, gen: 'u5_cr', params: [r, pi.s], q: `반지름 ${r} cm인 원의 원주는 □ cm (원주율 ${pi.s})`, hint: '지름은 반지름의 2배입니다.', ans, mode: 'dec', unitLabel: 'cm', distract: [rMul(R(r, 1), pi.v), rMul(R(r * r, 1), pi.v), rMul(R(4 * r, 1), pi.v)], diagram: { kind: 'circle', label: `반지름 ${r} cm`, mode: 'radius', pi: pi.s, ask: '원주 = ? cm' } };
    }
    if (v === 2) { // area from radius
      const r = rng.int(2, 10);
      const p2 = rng.pick([PIS[0], PIS[2]]);
      const ans = rMul(R(r * r, 1), p2.v);
      return { unit: 5, gen: 'u5_ar', params: [r, p2.s], q: `반지름 ${r} cm인 원의 넓이는 □ cm² (원주율 ${p2.s})`, hint: '(원의 넓이) = (반지름) × (반지름) × (원주율)', ans, mode: 'dec', unitLabel: 'cm²', distract: [rMul(R(2 * r, 1), p2.v), rMul(R(4 * r * r, 1), p2.v), rMul(R(r * r, 1), R(1, 1))], diagram: { kind: 'circle', label: `반지름 ${r} cm`, mode: 'radius', pi: p2.s, ask: '넓이 = ? cm²' } };
    }
    if (v === 3) { // diameter from circumference
      const d = rng.int(3, 16);
      const C = rMul(R(d, 1), pi.v);
      return { unit: 5, gen: 'u5_dc', params: [d, pi.s], q: `원주가 ${show(C, 'dec')} cm인 원의 지름은 □ cm (원주율 ${pi.s})`, hint: '(지름) = (원주) ÷ (원주율)', ans: R(d, 1), mode: 'dec', unitLabel: 'cm', distract: [R(d * 2, 1), R(Math.max(1, Math.floor(d / 2)), 1), R(d + 1, 1)] };
    }
    // radius from area (pi = 3)
    const r = rng.int(2, 9);
    return { unit: 5, gen: 'u5_ra', params: [r], q: `넓이가 ${3 * r * r} cm²인 원의 반지름은 □ cm (원주율 3)`, hint: '넓이 ÷ 3 = (반지름) × (반지름)', ans: R(r, 1), mode: 'dec', unitLabel: 'cm', distract: [R(r * r, 1), R(2 * r, 1), R(r + 1, 1)] };
  };
  U5.blank = function (rng) {
    const r = rng.int(2, 9);
    const p = rng.pick([PIS[0], PIS[1]]);
    const area = rMul(R(r * r, 1), p.v);
    return base(5, 'u5_blank', [r, p.s], {
      type: 'typeB_blank', q: `지름 ${2 * r} cm인 원의 넓이를 구하세요. (원주율 ${p.s})`, hint: '넓이는 지름이 아니라 반지름으로 구합니다.',
      equationTemplate: `반지름 ① cm  →  넓이 = ① × ① × ${p.s} = ② cm²`,
      blanks: [{ label: '① 반지름 (cm)', answer: String(r), ans: R(r, 1) }, { label: '② 넓이 (cm²)', answer: decStr(area), ans: area }],
      diagram: { kind: 'circle', label: `지름 ${2 * r} cm`, mode: 'diameter', pi: p.s, ask: '넓이 = ? cm²' }, device: 'gear'
    });
  };
  U5.match = function (rng) {
    const items = []; const rights = new Set();
    for (let t = 0; t < 60 && items.length < 3; t++) {
      const which = items.length;
      let it;
      if (which === 0) { const d = rng.int(2, 15); it = { left: `지름 ${d} cm인 원의 원주`, right: `${d * 3} cm`, p: ['c', d] }; }
      else if (which === 1) { const r = rng.int(2, 9); it = { left: `반지름 ${r} cm인 원의 넓이`, right: `${r * r * 3} cm²`, p: ['a', r] }; }
      else { const d = rng.int(2, 15); it = { left: `원주가 ${d * 3} cm인 원의 지름`, right: `${d} cm`, p: ['d', d] }; }
      if (rights.has(it.right)) continue;
      rights.add(it.right); items.push(it);
    }
    if (items.length < 3) return null;
    return matchFrom(5, 'u5_match', items, '원주율이 3일 때 알맞은 값을 연결하세요.', '(원주) = (지름) × 3, (넓이) = (반지름) × (반지름) × 3');
  };
  U5.cards = function (rng) {
    const r = rng.int(3, 9);
    const C = `${6 * r} cm`, A = `${3 * r * r} cm²`;
    const dis = [`${3 * r} cm`, `${12 * r * r} cm²`, `${6 * r} cm²`].filter(x => x !== C && x !== A);
    const cards = rng.shuffle([C, A].concat(rng.shuffle(dis).slice(0, 2)));
    return base(5, 'u5_cards', [r], {
      type: 'typeC_drag', q: `반지름 ${r} cm인 원 잠금장치 (원주율 3)`, hint: '원주는 cm, 넓이는 cm² 단위입니다.',
      slots: [{ label: '원주', answer: C }, { label: '넓이', answer: A }], cards,
      diagram: { kind: 'circle', label: `반지름 ${r} cm`, mode: 'radius', pi: '3', ask: '원주와 넓이는?' }, device: 'gear'
    });
  };

  // ================================================================ UNIT 6
  const U6 = {};
  const PROPS6 = {
    '원기둥': ['두 밑면이 평행하고 합동인 원이다', '밑면이 2개이고 옆면이 굽은 면이다', '전개도에서 옆면이 직사각형이다', '직사각형을 한 변을 축으로 돌려 만든다'],
    '원뿔': ['꼭짓점이 1개 있다', '밑면이 1개인 뿔 모양이다', '모선이 있다', '직각삼각형을 한 변을 축으로 돌려 만든다'],
    '구': ['어느 방향에서 보아도 원 모양이다', '밑면과 꼭짓점이 없다', '중심에서 겉면까지 거리가 모두 같다', '반원을 지름을 축으로 돌려 만든다']
  };
  U6.sorter = function (rng) {
    const shapes = rng.shuffle(['원기둥', '원뿔', '구']);
    const slots = shapes.map(s => ({ label: rng.pick(PROPS6[s]), answer: s }));
    const cards = rng.shuffle(['원기둥', '원뿔', '구', rng.pick(['각기둥', '각뿔'])]);
    return base(6, 'u6_sort', slots.map(s => s.label), { type: 'typeC_drag', q: '설명에 맞는 입체도형 카드를 분류하세요.', hint: '밑면 수, 꼭짓점, 옆면 모양을 떠올려 보세요.', slots, cards, device: 'sorter' });
  };
  U6.match = function (rng) {
    const shapes = rng.shuffle(['원기둥', '원뿔', '구']);
    const items = shapes.map(s => ({ left: s, right: rng.pick(PROPS6[s]), p: [s] }));
    return matchFrom(6, 'u6_match', items, '입체도형과 알맞은 설명을 연결하세요.', '밑면의 개수와 꼭짓점이 있는지 떠올려 보세요.');
  };
  U6.core = function (rng, variant) {
    const v = variant != null ? variant : rng.int(0, 3);
    if (v === 0) { // net lateral width
      const r = rng.int(2, 9), pi = rng.pick(PIS), h = rng.int(4, 15);
      const ans = rMul(R(2 * r, 1), pi.v);
      return { unit: 6, gen: 'u6_net', params: [r, h, pi.s], q: `밑면 반지름 ${r} cm, 높이 ${h} cm 원기둥의 전개도에서 옆면의 가로는 □ cm (원주율 ${pi.s})`, hint: '옆면의 가로 = 밑면의 둘레', ans, mode: 'dec', unitLabel: 'cm', distract: [rMul(R(r, 1), pi.v), R(h, 1), rMul(R(r * r, 1), pi.v)], diagram: { kind: 'net', r, h, pi: pi.s } };
    }
    if (v === 1) { // cone from right triangle
      const a = rng.int(2, 9), b = rng.int(3, 12);
      return { unit: 6, gen: 'u6_cone', params: [a, b], q: `밑변 ${a} cm, 높이 ${b} cm인 직각삼각형을 높이를 축으로 돌린 원뿔의 밑면 지름은 □ cm`, hint: '밑변이 밑면의 반지름이 됩니다.', ans: R(2 * a, 1), mode: 'dec', unitLabel: 'cm', distract: [R(a, 1), R(b, 1), R(2 * b, 1)], diagram: { kind: 'rotate', shape: 'triangle', w: a, h: b } };
    }
    if (v === 2) { // cylinder from rectangle
      const a = rng.int(2, 8), b = rng.int(3, 12);
      if (a === b) return null;
      return { unit: 6, gen: 'u6_cyl', params: [a, b], q: `가로 ${a} cm, 세로 ${b} cm인 직사각형을 세로를 축으로 돌린 원기둥의 밑면 지름은 □ cm`, hint: '가로가 밑면의 반지름이 됩니다.', ans: R(2 * a, 1), mode: 'dec', unitLabel: 'cm', distract: [R(a, 1), R(b, 1), R(2 * b, 1)], diagram: { kind: 'rotate', shape: 'rect', w: a, h: b } };
    }
    // sphere from semicircle
    const D2 = rng.int(3, 15) * 2;
    return { unit: 6, gen: 'u6_sph', params: [D2], q: `지름 ${D2} cm인 반원을 지름을 축으로 돌린 구의 반지름은 □ cm`, hint: '반원의 지름이 구의 지름이 됩니다.', ans: R(D2 / 2, 1), mode: 'dec', unitLabel: 'cm', distract: [R(D2, 1), R(D2 * 2, 1), R(D2 / 2 + 1, 1)], diagram: { kind: 'rotate', shape: 'semi', w: D2 / 2, h: D2 } };
  };
  U6.cards = function (rng) {
    if (rng.chance(0.5)) {
      const r = rng.int(2, 8), h = rng.int(4, 14);
      if (6 * r === h) return null;
      const W = `${6 * r} cm`, H = `${h} cm`;
      const cards = rng.shuffle([W, H, `${3 * r} cm`, `${3 * r * r} cm`].filter((v, i, a) => a.indexOf(v) === i));
      if (cards.length < 4) return null;
      return base(6, 'u6_netcards', [r, h], { type: 'typeC_drag', q: `밑면 반지름 ${r} cm, 높이 ${h} cm 원기둥의 전개도 (원주율 3)`, hint: '옆면의 가로는 밑면의 둘레, 세로는 원기둥의 높이입니다.', slots: [{ label: '옆면의 가로', answer: W }, { label: '옆면의 세로', answer: H }], cards, diagram: { kind: 'net', r, h, pi: '3' } });
    }
    const a = rng.int(2, 7), b = rng.int(3, 11);
    if (a === b || 2 * a === b) return null;
    const isTri = rng.chance(0.5);
    const shape = isTri ? '원뿔' : '원기둥';
    const cards = rng.shuffle([shape, isTri ? '원기둥' : '원뿔', `${2 * a} cm`, `${a} cm`]);
    return base(6, 'u6_rotcards', [a, b, isTri ? 1 : 0], { type: 'typeC_drag', q: `${isTri ? '직각삼각형' : '직사각형'}을 높이 ${b} cm인 변을 축으로 1회전시켰습니다.`, hint: `축에서 떨어진 변 ${a} cm가 밑면의 반지름입니다.`, slots: [{ label: '만들어진 입체도형', answer: shape }, { label: '밑면의 지름', answer: `${2 * a} cm` }], cards, diagram: { kind: 'rotate', shape: isTri ? 'triangle' : 'rect', w: a, h: b } });
  };

  // ------------------------------------------------------------- generic helpers
  function matchFrom(unit, gen, items, q, hint) {
    const p = base(unit, gen, items.map(i => i.p), { type: 'typeA_match', q, hint });
    p.pairs = items.map(i => ({ left: i.left, right: i.right }));
    p.rightOptions = items.map((i, idx) => ({ id: 'r' + idx, label: i.right, matchIdx: idx }));
    return p;
  }
  function numericMatch(unit, gen, rng, coreFn, q, hint) {
    const items = []; const seen = new Set(); const lefts = new Set();
    for (let t = 0; t < 60 && items.length < 3; t++) {
      const c = coreFn(rng);
      if (!c) continue;
      const left = c.q.replace(/\s*=\s*□.*$/, '').replace(/ □.*$/, '');
      const right = show(c.ans, c.mode) + (c.unitLabel && c.unitLabel !== '병' ? ' ' + c.unitLabel : '');
      if (seen.has(right) || lefts.has(left) || left.includes('□')) continue;
      seen.add(right); lefts.add(left);
      items.push({ left, right, p: c.params });
    }
    if (items.length < 3) return null;
    return matchFrom(unit, gen, items, q, hint);
  }
  function cardsFromCores(unit, gen, rng, coreFn, q, hint) {
    const a = coreFn(rng), b = coreFn(rng);
    if (!a || !b) return null;
    const la = a.q.replace(/\s*=\s*□.*$/, ''), lb = b.q.replace(/\s*=\s*□.*$/, '');
    if (la.includes('□') || lb.includes('□') || la === lb) return null;
    const A = show(a.ans, a.mode), B = show(b.ans, b.mode);
    if (A === B) return null;
    const ds = [];
    (a.distract || []).concat(b.distract || []).forEach(x => { if (x && x.n > 0) { const s = show(x, a.mode); if (s !== A && s !== B && !ds.includes(s)) ds.push(s); } });
    if (ds.length < 2) return null;
    const cards = rng.shuffle([A, B].concat(rng.shuffle(ds).slice(0, 2)));
    return base(unit, gen, [a.params, b.params], { type: 'typeC_drag', q, hint, slots: [{ label: la, answer: A }, { label: lb, answer: B }], cards });
  }

  // which generator to use for (unit, type)
  const CORE = { 1: U1.core, 2: U2.core, 3: U3.core, 4: U4.core, 5: U5.core, 6: U6.core };
  const TYPE_TABLE = {
    1: { A: r => numericMatch(1, 'u1_match', r, x => U1.core(x, x.int(0, 2)), '나눗셈 식과 몫을 연결하세요.', '나누는 분수의 분모와 분자를 바꾸어 곱합니다.'), B: U1.blank, C: r => cardsFromCores(1, 'u1_cards', r, x => U1.core(x, x.int(0, 2)), '두 식의 몫을 카드에서 골라 배치하세요.', '분수의 나눗셈은 나누는 수의 역수를 곱합니다.'), F: r => U1.core(r), E: r => U1.core(r) },
    2: { A: r => numericMatch(2, 'u2_match', r, x => U2.core(x, x.int(0, 3)), '나눗셈 식과 몫을 연결하세요.', '두 수의 소수점을 같은 자리만큼 옮깁니다.'), B: U2.blank, C: r => cardsFromCores(2, 'u2_cards', r, x => U2.core(x, x.int(0, 3)), '두 식의 몫을 카드에서 골라 배치하세요.', '나누는 수를 자연수로 만들면 쉬워집니다.'), F: r => U2.core(r), E: r => U2.core(r) },
    3: { A: U3.match, D: U3.voxel, F: r => U3.core(r), E: r => U3.core(r), C: r => { const g = randomHeights(r, 5); const f = frontView(g).reduce((a, b) => a + b, 0), s = sideView(g).reduce((a, b) => a + b, 0), t = total(g); if (f === s) return null; const cards = r.shuffle([String(f), String(s), String(t), String(Math.max(f, s) + 1)].filter((v, i, a) => a.indexOf(v) === i)); if (cards.length < 4) return null; return base(3, 'u3_cards', g.flat(), { type: 'typeC_drag', q: '그림은 위에서 본 모양이고 칸의 수는 쌓은 개수입니다. 앞과 옆에서 보이는 정사각형 수를 카드에서 골라 놓으세요.', hint: '앞에서는 세로줄, 옆에서는 가로줄의 가장 높은 층이 보입니다.', slots: [{ label: '앞에서 본 정사각형 수', answer: String(f) }, { label: '오른쪽 옆에서 본 정사각형 수', answer: String(s) }], cards, diagram: { kind: 'topNumbers', grid: g, arrow: 'both' } }); } },
    4: { A: U4.match, B: r => (r.chance(0.5) ? U4.blank(r) : U4.bridge(r)), C: U4.cards, F: r => U4.core(r), E: r => (r.chance(0.3) ? U4.dupeRatio(r) : U4.core(r)) },
    5: { A: U5.match, B: U5.blank, C: U5.cards, F: r => U5.core(r), E: r => U5.core(r) },
    6: { A: U6.match, C: r => (r.chance(0.45) ? U6.sorter(r) : U6.cards(r)), F: r => U6.core(r), E: r => U6.core(r) }
  };
  const TYPE_CODE = { A: 'typeA_match', B: 'typeB_blank', C: 'typeC_drag', D: 'typeD_voxel', E: 'typeE_dupe', F: 'typeF_device' };

  function generate(unit, code, rng) {
    const fn = TYPE_TABLE[unit][code];
    if (!fn) return null;
    const out = fn(rng);
    if (!out) return null;
    let p = out;
    if (!out.type) { // numeric core
      p = asNumeric(out, { type: code === 'E' ? 'E' : 'F', rng, device: unit === 5 ? 'gear' : (rng.chance(0.5) ? 'monolith' : 'gear') });
    }
    if (p.type === 'typeF_device' && !p.device) p.device = p.deviceType;
    if (p.type === 'typeA_match' || p.type === 'typeB_blank') p.device = p.device || null;
    p.numSig = numberSignature(p);
    return p;
  }
  function numberSignature(p) {
    const s = JSON.stringify(p.params);
    const nums = (s.match(/\d+(\.\d+)?/g) || []).map(Number).sort((a, b) => a - b);
    return p.unit + ':' + p.gen.replace(/_.*/, '') + ':' + nums.join(',');
  }

  // ----------------------------------------------------------------- validation
  function validateProblem(p) {
    const errs = [];
    if (!p || !p.type) return ['no type'];
    if (!UNIT_NAMES[p.unit]) errs.push('bad unit');
    if (!p.q || p.q.length > 70) errs.push('question missing/too long (' + (p.q || '').length + ')');
    if (p.type === 'typeF_device') {
      const a = parseNum(p.a);
      if (!a) errs.push('answer not numeric'); else if (!rEq(a, p.ans)) errs.push('answer string mismatch');
      if (!(a && a.n > 0)) errs.push('non-positive answer');
    } else if (p.type === 'typeE_dupe') {
      if (!Array.isArray(p.dupeChoices) || p.dupeChoices.length !== 3) errs.push('need 3 choices');
      else {
        if (new Set(p.dupeChoices).size !== 3) errs.push('duplicate choices');
        if (p.dupeChoices.filter(c => c === p.a).length !== 1) errs.push('answer not exactly once in choices');
        // value-distinct for numeric choices
        const vals = p.dupeChoices.map(parseNum);
        if (vals.every(Boolean)) { for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (rEq(vals[i], vals[j])) errs.push('choices equal in value'); }
        p.dupeChoices.forEach(c => { if (String(c).length > 9) errs.push('door label too long: ' + c); });
      }
    } else if (p.type === 'typeA_match') {
      if (!p.pairs || p.pairs.length !== 3) errs.push('need 3 pairs');
      else {
        const rights = p.rightOptions.map(o => o.label);
        if (new Set(rights).size !== rights.length) errs.push('duplicate right labels');
        const rv = rights.map(x => parseNum(String(x).replace(/\s*(cm²|cm|m²|m|개|병)$/, '')));
        if (rv.every(Boolean)) for (let i = 0; i < rv.length; i++) for (let j = i + 1; j < rv.length; j++) if (rEq(rv[i], rv[j]) && rights[i].replace(/[\d./\s]/g, '') === rights[j].replace(/[\d./\s]/g, '')) errs.push('right values equal');
        p.rightOptions.forEach(o => { if (/[÷×]/.test(o.label)) errs.push('right label shows an expression'); if (p.pairs.some(pp => pp.left === o.label)) errs.push('right equals a left'); });
        if (new Set(p.pairs.map(x => x.left)).size !== 3) errs.push('duplicate lefts');
        p.rightOptions.forEach((o, i) => { if (o.matchIdx !== i || p.pairs[i].right !== o.label) errs.push('matchIdx mismatch'); });
      }
    } else if (p.type === 'typeB_blank') {
      if (!p.blanks || p.blanks.length < 2) errs.push('need 2 blanks');
      else p.blanks.forEach(b => { const v = parseNum(b.answer); if (!v || !rEq(v, b.ans)) errs.push('blank answer mismatch ' + b.answer); });
      if (!/①/.test(p.equationTemplate) || !/②/.test(p.equationTemplate)) errs.push('template lacks blanks');
      if (p.bridgeSplit) { const [a, b] = p.bridgeSplit.ratio; const T = p.bridgeSplit.total; const k = T / (a + b); if (+p.blanks[0].answer !== a * k || +p.blanks[1].answer !== b * k) errs.push('bridge split wrong'); }
    } else if (p.type === 'typeC_drag') {
      if (!p.slots || p.slots.length < 2) errs.push('need slots');
      else {
        if (new Set(p.cards).size !== p.cards.length) errs.push('duplicate cards');
        const answers = p.slots.map(s => s.answer);
        if (new Set(answers).size !== answers.length) errs.push('duplicate slot answers (ambiguous)');
        answers.forEach(a => { if (!p.cards.includes(a)) errs.push('answer card missing ' + a); });
        if (p.cards.length < answers.length + 1) errs.push('no distractor card');
      }
    } else if (p.type === 'typeD_voxel') {
      const sol = countSolutions(p.footprint, p.front, p.side, p.total, 3);
      if (sol.count !== 1) errs.push('voxel not unique: ' + sol.count);
      else if (JSON.stringify(sol.found) !== JSON.stringify(p.targetGrid)) errs.push('voxel target mismatch');
      if (p.diagram && (p.diagram.grid || p.diagram.heights)) errs.push('diagram leaks heights');
    }
    if (p.hint && p.hint.length > 80) errs.push('hint too long');
    return errs;
  }

  // answer checking for typed answers (value equality — 2/4 = 1/2 = 0.5 are all accepted)
  function checkTyped(expected, typed) {
    const a = parseNum(typed);
    const e = typeof expected === 'string' ? parseNum(expected) : expected;
    if (!a || !e) return false;
    return rEq(a, e);
  }

  // ----------------------------------------------------------------- deck
  function Deck(units, seed) {
    this.units = units.slice().sort();
    this.seed = seed;
    this.usedSig = new Set(); this.usedNum = new Set();
    this.unitUse = {}; this.units.forEach(u => { this.unitUse[u] = 0; });
    this.typeUse = {}; this.lastType = null;
    this.history = [];
    this.defUsed = new Set(); this.defCount = 0;
  }
  const KIND_TYPES = {
    dupe: ['E'], bridge: ['F', 'B'], door: ['F', 'B', 'A', 'C', 'D'], terminal: ['F', 'B', 'A', 'C', 'D'], any: ['F', 'B', 'A', 'C', 'D']
  };
  Deck.prototype.draw = function (kind, door) {
    const rng = makeRng('prob', this.seed, door, kind);
    const minUse = Math.min(...this.units.map(u => this.unitUse[u]));
    const unitOrder = rng.shuffle(this.units.filter(u => this.unitUse[u] === minUse)).concat(rng.shuffle(this.units.filter(u => this.unitUse[u] !== minUse)));
    for (const unit of unitOrder) {
      let codes = (KIND_TYPES[kind] || KIND_TYPES.any).filter(c => TYPE_TABLE[unit][c]);
      if (kind === 'bridge' && unit === 4) codes = ['B'];
      // prefer types used least in this game, avoid repeating the last type
      codes = rng.shuffle(codes).sort((a, b) => (this.typeUse[a] || 0) - (this.typeUse[b] || 0));
      const nonRepeat = codes.filter(c => TYPE_CODE[c] !== this.lastType);
      if (nonRepeat.length) codes = nonRepeat.concat(codes.filter(c => !nonRepeat.includes(c)));
      for (const code of codes) {
        for (let t = 0; t < 60; t++) {
          let p = generate(unit, code, rng);
          if (!p) continue;
          if (kind === 'bridge' && p.type !== 'typeB_blank') { p.deviceType = 'bridge'; p.device = 'bridge'; }
          if (kind === 'bridge' && p.type === 'typeB_blank' && !p.bridgeSplit) continue;
          if (this.usedSig.has(p.sig) || this.usedNum.has(p.numSig)) continue;
          if (validateProblem(p).length) continue;
          this.usedSig.add(p.sig); this.usedNum.add(p.numSig);
          this.unitUse[unit]++; this.typeUse[code] = (this.typeUse[code] || 0) + 1; this.lastType = p.type;
          p.id = 'P' + door + '_' + (hashSig(p.sig) % 100000);
          p.door = door;
          this.history.push(p.sig);
          return p;
        }
      }
    }
    // last resort (should never happen): any unit, any numeric
    const p = asNumeric(U1.core(rng, 2) || U1.core(rng, 0) || { unit: 1, gen: 'u1_fallback', params: [door], q: '6 ÷ 3/4 = □', hint: '6 × 4/3', ans: R(8, 1) }, { type: kind === 'dupe' ? 'E' : 'F', rng });
    p.id = 'PF' + door; p.door = door; p.fallback = true; p.numSig = 'fallback' + door;
    this.history.push(p.sig);
    return p;
  };
  // closet latch defence (V5.2): 그림 없이 글만 보고 10초 안에 암산으로 풀 수 있는 문제만.
  // 선택한 단원에서만 출제, 보기 3개는 서로 값이 다르고(동치 분수 금지) 흔한 실수를 오답으로 사용.
  function gcdI(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  function fr(n, d) { const g = gcdI(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + '/' + d; }
  function dec(tenths) { const v = tenths / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); }
  function dec2(hund) { const v = hund / 100; return (Math.round(v * 100) / 100).toString(); }
  function valOf(str) { const m = String(str).match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2]; const r = String(str).match(/^(\d+) : (\d+)$/); if (r) return +r[1] * 1000 + +r[2]; return parseFloat(str); }
  const DEF = {
    1: [
      rng => { const n = rng.pick([5, 7, 9, 11, 13]), b = rng.int(2, 4), k = rng.int(2, 4), a = b * k; if (a >= n) return null;
        return { q: `${a}/${n} ÷ ${b}/${n} = □`, a: String(k), w: [fr(b, a), String(a - b)] }; },
      rng => { const k = rng.int(2, 9), m = rng.int(2, 6);
        return { q: `${k} ÷ 1/${m} = □`, a: String(k * m), w: [fr(k, m), String(k + m)] }; },
      rng => { const b = rng.int(2, 4), c = rng.int(b + 1, 7), k = b * rng.int(2, 4); if (gcdI(b, c) !== 1) return null;
        return { q: `${k} ÷ ${b}/${c} = □`, a: String(k / b * c), w: [fr(k * b, c), String(k / b)] }; },
      rng => { const n = rng.pick([3, 5, 7]), a = rng.int(1, n - 1), k = rng.int(2, 4); if (gcdI(a, n) !== 1) return null;
        return { q: `${a}/${n} ÷ ${k} = □`, a: fr(a, n * k), w: [fr(a * k, n), fr(n * k, a)] }; },
      rng => { const m = rng.int(2, 5), b = rng.int(2, 9);
        return { q: `1/${m} ÷ 1/${m * b} = □`, a: String(b), w: [fr(1, b), String(m * b)] }; }
    ],
    2: [
      rng => { const d = rng.int(2, 9), q = rng.int(2, 9);
        return { q: `${dec(d * q)} ÷ ${dec(d)} = □`, a: String(q), w: [dec(q), String(q * 10)] }; },
      rng => { const k = rng.int(2, 9), d = rng.pick([2, 4, 5]); if ((k * 10) % d) return null;
        return { q: `${k} ÷ ${dec(d)} = □`, a: String(k * 10 / d), w: [dec(k * 10 / d), String(k * 100 / d)] }; },
      rng => { const d = rng.int(2, 9), q = rng.int(11, 19);
        return { q: `${dec(d * q)} ÷ ${dec(d)} = □`, a: String(q), w: [dec(q), String(q * 10)] }; },
      rng => { const d = rng.int(2, 9), q = rng.int(2, 9);
        return { q: `${dec(d * q)} ÷ ${d} = □`, a: dec(q), w: [String(q), dec2(q)] }; },
      rng => { const d = rng.pick([12, 15, 25]), q = rng.int(2, 6);
        return { q: `${dec2(d * q)} ÷ ${dec2(d)} = □`, a: String(q), w: [dec(q), String(q * 10)] }; }
    ],
    3: [
      rng => { const a = rng.int(2, 4), b = rng.int(2, 4), c = rng.int(2, 3);
        return { q: `가로 ${a}개, 세로 ${b}개로 ${c}층을 쌓은 직육면체 모양의 쌓기나무는 모두 □개`, a: String(a * b * c), w: [String(a * b + c), String(a * b * (c - 1) || a + b + c)], unit: '개' }; },
      rng => { const x = rng.int(4, 7), y = rng.int(2, x - 1), z = rng.int(1, y - 1);
        return { q: `1층 ${x}개, 2층 ${y}개, 3층 ${z}개를 쌓았습니다. 쌓기나무는 모두 □개`, a: String(x + y + z), w: [String(x + y), String(x + y + z + 1)], unit: '개' }; },
      rng => { const n = rng.int(2, 3);
        return { q: `한 모서리에 ${n}개씩 놓아 정육면체 모양으로 쌓은 쌓기나무는 모두 □개`, a: String(n * n * n), w: [String(n * n), String(n * 3)], unit: '개' }; },
      rng => { const k = rng.int(4, 8), m = rng.int(2, 3);
        return { q: `위에서 본 모양이 ${k}칸이고 모든 칸에 ${m}층씩 쌓았습니다. 쌓기나무는 모두 □개`, a: String(k * m), w: [String(k + m), String(k)], unit: '개' }; },
      rng => { const a = rng.int(2, 4), b = rng.int(2, 4), c = rng.int(2, 3);
        return { q: `가로 ${a}개, 세로 ${b}개, ${c}층 직육면체 모양에서 맨 위층을 모두 빼면 남는 쌓기나무는 □개`, a: String(a * b * (c - 1)), w: [String(a * b * c), String(a * b)], unit: '개' }; }
    ],
    4: [
      rng => { const a = rng.int(2, 9), b = rng.int(2, 9), k = rng.int(2, 5); if (a === b) return null;
        return { q: `${a} : ${b} = ${a * k} : □`, a: String(b * k), w: [String(b + k), String(a * k)] }; },
      rng => { const a = rng.int(2, 9), b = rng.int(2, 9), k = rng.int(2, 5); if (a === b) return null;
        return { q: `${a} : □ = ${a * k} : ${b * k}`, a: String(b), w: [String(b * k), String(b + 1)] }; },
      rng => { const p = rng.int(1, 4), q = rng.int(1, 4), u = rng.int(3, 9); if (p === q || gcdI(p, q) !== 1) return null; const t = (p + q) * u, front = rng.chance(0.5);
        return { q: `사탕 ${t}개를 형과 동생이 ${p} : ${q}로 나누어 가지면 ${front ? '형' : '동생'}은 □개`, a: String((front ? p : q) * u), w: [String((front ? q : p) * u), String(t / 2 === Math.floor(t / 2) && t / 2 !== p * u && t / 2 !== q * u ? t / 2 : (front ? p : q) * u + u)], unit: '개' }; },
      rng => { const a = rng.int(2, 6), b = rng.int(2, 6), k = rng.int(2, 4); if (a === b || gcdI(a, b) !== 1) return null;
        return { q: `${a * k} : ${b * k}를 가장 간단한 자연수의 비로 나타내면 □`, a: `${a} : ${b}`, w: [`${b} : ${a}`, `${a} : ${a + b}`] }; },
      rng => { const a = rng.int(2, 6), b = rng.int(2, 6), k = rng.int(2, 4);
        return { q: `비례식 ${a} : ${b} = ${a * k} : ${b * k}에서 외항의 곱은 □`, a: String(a * b * k), w: [String(a * b * k + a), String(a * a * k)] }; }
    ],
    5: [
      rng => { const d = rng.int(3, 12);
        return { q: `지름 ${d} cm인 원의 원주는 □ cm (원주율 3)`, a: String(d * 3), w: [String(d * 6), String(d * d * 3)], unit: 'cm' }; },
      rng => { const r = rng.int(2, 9);
        return { q: `반지름 ${r} cm인 원의 원주는 □ cm (원주율 3)`, a: String(r * 6), w: [String(r * 3), String(r * r * 3)], unit: 'cm' }; },
      rng => { const r = rng.int(2, 7);
        return { q: `반지름 ${r} cm인 원의 넓이는 □ cm² (원주율 3)`, a: String(r * r * 3), w: [String(r * 6), String(r * r * 12)], unit: 'cm²' }; },
      rng => { const d = rng.int(3, 12);
        return { q: `원주가 ${d * 3} cm인 원의 지름은 □ cm (원주율 3)`, a: String(d), w: [String(d * 2), String(d * 3 * 3)], unit: 'cm' }; },
      rng => { const d = rng.pick([1, 2, 10, 20]);
        return { q: `지름 ${d} cm인 원의 원주는 □ cm (원주율 3.14)`, a: dec2(d * 314), w: [dec2(d * 628), String(d * 3)], unit: 'cm' }; },
      rng => { const r = rng.pick([1, 10]);
        return { q: `반지름 ${r} cm인 원의 넓이는 □ cm² (원주율 3.14)`, a: dec2(r * r * 314), w: [dec2(r * 628), dec2(r * r * 314 * 4)], unit: 'cm²' }; }
    ],
    6: [
      rng => { const a = rng.int(3, 9), b = rng.int(3, 9); if (a === b || a * 2 === b) return null;
        return { q: `가로 ${a} cm, 세로 ${b} cm인 직사각형을 세로를 축으로 한 바퀴 돌린 원기둥의 밑면 지름은 □ cm`, a: String(a * 2), w: [String(a), String(b)], unit: 'cm' }; },
      rng => { const a = rng.int(3, 9), b = rng.int(3, 9); if (a === b || a * 2 === b) return null;
        return { q: `가로 ${a} cm, 세로 ${b} cm인 직사각형을 세로를 축으로 한 바퀴 돌린 원기둥의 높이는 □ cm`, a: String(b), w: [String(a), String(a * 2)], unit: 'cm' }; },
      rng => { const a = rng.int(3, 9), h = rng.int(4, 12); if (a === h || a * 2 === h) return null;
        return { q: `밑변 ${a} cm, 높이 ${h} cm인 직각삼각형을 높이를 축으로 돌린 원뿔의 밑면 반지름은 □ cm`, a: String(a), w: [String(h), String(a * 2)], unit: 'cm' }; },
      rng => { const d = rng.int(4, 15) * 2;
        return { q: `지름 ${d} cm인 반원을 지름을 축으로 돌려 만든 구의 반지름은 □ cm`, a: String(d / 2), w: [String(d), String(d * 2)], unit: 'cm' }; },
      rng => { const r = rng.int(2, 8);
        return { q: `밑면 반지름 ${r} cm인 원기둥의 전개도에서 옆면 가로의 길이는 □ cm (원주율 3)`, a: String(r * 6), w: [String(r * 3), String(r * r * 3)], unit: 'cm' }; },
      rng => rng.pick([
        { q: '원기둥의 밑면은 □개', a: '2', w: ['1', '3'], unit: '개' },
        { q: '원뿔의 꼭짓점은 □개', a: '1', w: ['0', '2'], unit: '개' },
        { q: '원뿔의 밑면은 □개', a: '1', w: ['2', '0'], unit: '개' },
        { q: '원기둥의 옆면을 펼치면 □ 모양', a: '직사각형', w: ['원', '삼각형'] },
        { q: '구는 어느 방향에서 보아도 □ 모양입니다.', a: '원', w: ['삼각형', '직사각형'] }])
    ]
  };
  function makeDefense(unit, rng) {
    const gens = DEF[unit]; if (!gens) return null;
    const raw = rng.pick(gens)(rng);
    if (!raw) return null;
    const all = [raw.a].concat(raw.w);
    // 보기 값이 서로 달라야 함 (2/4와 1/2 같은 동치, 소수/정수 같은 값 금지)
    const vals = all.map(valOf);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      if (all[i] === all[j]) return null;
      if (Number.isFinite(vals[i]) && Number.isFinite(vals[j]) && Math.abs(vals[i] - vals[j]) < 1e-9) return null;
    }
    if (all.some(x => x === '0' && raw.a !== '0' && !/꼭짓점|밑면/.test(raw.q))) return null;
    const u = raw.unit ? ' ' + raw.unit : '';
    return { q: raw.q, a: raw.a + u, choices: rng.shuffle(all).map(x => x + u) };
  }
  Deck.prototype.drawDefense = function () {
    const rng = makeRng('def', this.seed, this.defCount++);
    if (!this.defRecent) this.defRecent = [];
    let best = null;
    for (let t = 0; t < 300; t++) {
      const unit = rng.pick(this.units);
      const d = makeDefense(unit, rng);
      if (!d) continue;
      if (this.defRecent.includes(d.q)) continue;   // 최근 40문제와 같은 문제 금지
      best = { id: 'def_' + hashSig(d.q), unit, q: '[' + UNIT_NAMES[unit].replace(/^\d단원\. /, '') + '] ' + d.q, choices: d.choices, a: d.a, diagram: null };
      this.defRecent.push(d.q); if (this.defRecent.length > 40) this.defRecent.shift();
      return best;
    }
    const unit = this.units[0];
    for (let t = 0; t < 50; t++) { const d = makeDefense(unit, rng); if (d) return { id: 'def_fb', unit, q: '[' + UNIT_NAMES[unit].replace(/^\d단원\. /, '') + '] ' + d.q, choices: d.choices, a: d.a, diagram: null }; }
    return { id: 'def_fallback', unit: 1, q: '[분수의 나눗셈] 6 ÷ 3/4 = □', choices: ['6', '8', '9'], a: '8' };
  };
  // 테스트용 노출
  Deck.makeDefense = makeDefense;
  function hashSig(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  // ----------------------------------------------------------------- diagrams (SVG strings)
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function svgTopNumbers(g, arrow) {
    let s = '<svg viewBox="0 0 260 170" class="w-full max-w-[300px] h-auto">';
    s += '<text x="95" y="16" fill="#a78bfa" font-size="12" font-weight="bold" text-anchor="middle">위에서 본 모양 (수 = 층수)</text>';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = 47 + c * 34, y = 26 + r * 34, h = g[r][c];
      s += `<rect x="${x}" y="${y}" width="32" height="32" rx="4" fill="${h ? '#1e1b4b' : '#0b0e17'}" stroke="${h ? '#818cf8' : '#334155'}" stroke-width="1.5" ${h ? '' : 'stroke-dasharray="3,3"'}/>`;
      if (h) s += `<text x="${x + 16}" y="${y + 22}" fill="#fde68a" font-size="16" font-weight="900" text-anchor="middle">${h}</text>`;
    }
    s += '<text x="98" y="150" fill="#cbd5e1" font-size="11" text-anchor="middle">▲ 앞</text>';
    if (arrow === 'side' || arrow === 'both') s += '<text x="185" y="80" fill="#38bdf8" font-size="11" font-weight="bold">◀ 오른쪽 옆에서 보기</text>';
    if (arrow === 'front' || arrow === 'both') s += '<text x="98" y="165" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle">앞에서 보기 ▲</text>';
    return s + '</svg>';
  }
  function viewGrid(heights, x0, title, labelL, labelR) {
    let s = `<text x="${x0 + 40}" y="16" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle">${title}</text>`;
    for (let c = 0; c < 3; c++) for (let lv = 0; lv < 3; lv++) {
      const filled = lv < heights[c];
      s += `<rect x="${x0 + c * 27}" y="${100 - lv * 27}" width="25" height="25" rx="2" fill="${filled ? '#f59e0b' : '#111827'}" stroke="${filled ? '#fde68a' : '#334155'}" stroke-width="1.3"/>`;
    }
    if (labelL) s += `<text x="${x0}" y="140" fill="#94a3b8" font-size="9">${labelL}</text>`;
    if (labelR) s += `<text x="${x0 + 80}" y="140" fill="#94a3b8" font-size="9" text-anchor="end">${labelR}</text>`;
    return s;
  }
  function svgVoxelTarget(fp, front, side, tot) {
    let s = '<svg viewBox="0 0 330 150" class="w-full max-w-[380px] h-auto">';
    s += '<text x="52" y="16" fill="#a78bfa" font-size="11" font-weight="bold" text-anchor="middle">위에서 본 모양</text>';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = 10 + c * 28, y = 30 + r * 28;
      s += `<rect x="${x}" y="${y}" width="26" height="26" rx="3" fill="${fp[r][c] ? '#4f46e5' : '#0b0e17'}" stroke="${fp[r][c] ? '#a5b4fc' : '#334155'}" stroke-width="1.3"/>`;
    }
    s += '<text x="52" y="128" fill="#94a3b8" font-size="9" text-anchor="middle">▲ 앞</text>';
    s += `<text x="52" y="144" fill="#fde047" font-size="11" font-weight="bold" text-anchor="middle">모두 ${tot}개</text>`;
    s += viewGrid(front, 120, '앞에서 본 모양', '왼쪽', '오른쪽');
    s += viewGrid(side, 228, '오른쪽 옆에서 본 모양', '앞', '뒤');
    return s + '</svg>';
  }
  function svgViews(front, side) {
    let s = '<svg viewBox="0 0 330 150" class="w-full max-w-[380px] h-auto">';
    s += '<text x="52" y="16" fill="#a78bfa" font-size="11" font-weight="bold" text-anchor="middle">위에서 본 모양</text>';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s += `<rect x="${10 + c * 28}" y="${30 + r * 28}" width="26" height="26" rx="3" fill="#4f46e5" stroke="#a5b4fc" stroke-width="1.3"/>`;
    s += '<text x="52" y="128" fill="#94a3b8" font-size="9" text-anchor="middle">▲ 앞 (9칸 모두 쌓음)</text>';
    s += viewGrid(front, 120, '앞에서 본 모양', '왼쪽', '오른쪽');
    s += viewGrid(side, 228, '오른쪽 옆에서 본 모양', '앞', '뒤');
    return s + '</svg>';
  }
  function svgCircle(spec) {
    const isD = spec.mode === 'diameter';
    return `<svg viewBox="0 0 300 135" class="w-full max-w-[310px] h-auto">
      <circle cx="90" cy="68" r="54" fill="#1e1b4b" stroke="#f59e0b" stroke-width="3.5"/>
      <circle cx="90" cy="68" r="3.5" fill="#fff"/>
      <line x1="${isD ? 36 : 90}" y1="68" x2="144" y2="68" stroke="${isD ? '#fbbf24' : '#38bdf8'}" stroke-width="3"/>
      <text x="${isD ? 90 : 117}" y="58" fill="${isD ? '#fbbf24' : '#38bdf8'}" font-size="12" font-weight="bold" text-anchor="middle">${esc(spec.label)}</text>
      <rect x="168" y="34" width="124" height="68" rx="8" fill="#0f172a" stroke="#475569"/>
      <text x="230" y="58" fill="#fde047" font-size="12" font-weight="bold" text-anchor="middle">원주율 ${esc(spec.pi)}</text>
      <text x="230" y="84" fill="#cbd5e1" font-size="11" text-anchor="middle">${esc(spec.ask)}</text></svg>`;
  }
  function svgNet(spec) {
    return `<svg viewBox="0 0 340 150" class="w-full max-w-[350px] h-auto">
      <circle cx="105" cy="24" r="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
      <line x1="105" y1="24" x2="123" y2="24" stroke="#fde047" stroke-width="2"/>
      <text x="135" y="28" fill="#fde047" font-size="11" font-weight="bold">반지름 ${spec.r} cm</text>
      <rect x="45" y="46" width="160" height="56" rx="3" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5,3"/>
      <text x="125" y="78" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">옆면 가로 = ? cm</text>
      <text x="214" y="78" fill="#cbd5e1" font-size="11" font-weight="bold">높이 ${spec.h} cm</text>
      <circle cx="105" cy="124" r="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
      <text x="290" y="140" fill="#94a3b8" font-size="10" text-anchor="end">원주율 ${esc(spec.pi)}</text></svg>`;
  }
  function svgRotate(spec) {
    const W = 18 + spec.w * 6, H = 16 + spec.h * 6;
    const h = Math.min(H, 110), w = Math.min(W, 70);
    let shape = '';
    if (spec.shape === 'rect') shape = `<rect x="90" y="${120 - h}" width="${w}" height="${h}" fill="#38bdf8" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2.5"/>`;
    else if (spec.shape === 'triangle') shape = `<polygon points="90,${120 - h} 90,120 ${90 + w},120" fill="#38bdf8" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2.5"/>`;
    else shape = `<path d="M 90 ${70 - h / 2} A ${h / 2} ${h / 2} 0 0 1 90 ${70 + h / 2} Z" fill="#38bdf8" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2.5"/>`;
    const lab = spec.shape === 'semi' ? `<text x="70" y="74" fill="#fde047" font-size="11" font-weight="bold" text-anchor="end">지름 ${spec.h} cm</text>` :
      `<text x="${90 + w / 2}" y="134" fill="#fde047" font-size="11" font-weight="bold" text-anchor="middle">${spec.w} cm</text><text x="84" y="${120 - h / 2}" fill="#cbd5e1" font-size="11" font-weight="bold" text-anchor="end">${spec.h} cm</text>`;
    return `<svg viewBox="0 0 320 140" class="w-full max-w-[330px] h-auto">
      <line x1="90" y1="6" x2="90" y2="132" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="5,3"/>
      <text x="96" y="14" fill="#fb7185" font-size="10" font-weight="bold">회전축</text>${shape}${lab}
      <text x="250" y="70" fill="#fde047" font-size="12" font-weight="bold" text-anchor="middle">1회전</text></svg>`;
  }
  function svgProportion(spec) {
    return `<svg viewBox="0 0 340 100" class="w-full max-w-[350px] h-auto">
      <rect x="8" y="8" width="324" height="84" rx="10" fill="#0f172a" stroke="#334155"/>
      <text x="170" y="58" fill="#ffffff" font-size="22" font-weight="900" text-anchor="middle">${esc(spec.text)}</text>
      ${spec.showProducts ? '<text x="170" y="84" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle">바깥 두 수(외항)의 곱 = 안쪽 두 수(내항)의 곱</text>' : ''}</svg>`;
  }
  function svgBridge(spec) {
    const [a, b] = spec.ratio, tot = a + b;
    const w1 = 280 * a / tot;
    return `<svg viewBox="0 0 340 110" class="w-full max-w-[350px] h-auto">
      <text x="170" y="20" fill="#fde047" font-size="12" font-weight="bold" text-anchor="middle">다리 전체 ${spec.total} m · ${a} : ${b}</text>
      <rect x="30" y="38" width="${w1 - 2}" height="30" rx="5" fill="#0284c7" stroke="#bae6fd" stroke-width="2"/>
      <text x="${30 + w1 / 2}" y="58" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">앞판 ${a}칸</text>
      <rect x="${30 + w1 + 2}" y="38" width="${280 - w1 - 2}" height="30" rx="5" fill="#0f766e" stroke="#99f6e4" stroke-width="2"/>
      <text x="${30 + w1 + (280 - w1) / 2}" y="58" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">뒤판 ${b}칸</text>
      <line x1="30" y1="84" x2="310" y2="84" stroke="#94a3b8" stroke-width="2"/>
      <text x="170" y="100" fill="#cbd5e1" font-size="11" text-anchor="middle">전체를 ${tot}칸으로 나누어 생각하세요</text></svg>`;
  }
  // V6.2: 그림 속 글자도 분수는 세로 분수로 (예: '넓이 16/35 m²' → 넓이 [16 위 / 35 아래] m²)
  function svgW(str, fs) { let w = 0; for (const ch of String(str)) w += /[ -~]/.test(ch) ? (ch === ' ' ? 0.3 : 0.6) * fs : (ch === '²' ? 0.4 * fs : 1.0 * fs); return w; }
  function svgFracLabel(cx, cy, pre, val, post, fill, fs, weight) {
    const m = /^(?:(\d+)과\s*)?(\d+)\/(\d+)$/.exec(String(val));
    const attrs = `fill="${fill}" font-size="${fs}" font-weight="${weight || 'bold'}"`;
    if (!m) return `<text x="${cx}" y="${cy}" ${attrs} text-anchor="middle">${esc(pre + val + post)}</text>`;
    const whole = m[1] || '', n = m[2], d = m[3], ffs = Math.round(fs * 0.85);
    const fw = Math.max(n.length, d.length) * ffs * 0.62 + 6;
    const wPre = svgW(pre, fs), wWhole = whole ? svgW(whole, fs) + 2 : 0, wPost = svgW(post, fs);
    let x = cx - (wPre + wWhole + fw + wPost) / 2;
    const mid = cy - fs * 0.36;
    let out = '';
    if (pre) { out += `<text x="${x.toFixed(1)}" y="${cy}" ${attrs}>${esc(pre)}</text>`; x += wPre; }
    if (whole) { out += `<text x="${x.toFixed(1)}" y="${cy}" ${attrs}>${whole}</text>`; x += wWhole; }
    const fc = x + fw / 2;
    out += `<text x="${fc.toFixed(1)}" y="${(mid - 2).toFixed(1)}" fill="${fill}" font-size="${ffs}" font-weight="${weight || 'bold'}" text-anchor="middle">${n}</text>`;
    out += `<line x1="${(x + 1).toFixed(1)}" y1="${(mid + 1).toFixed(1)}" x2="${(x + fw - 1).toFixed(1)}" y2="${(mid + 1).toFixed(1)}" stroke="${fill}" stroke-width="1.6"/>`;
    out += `<text x="${fc.toFixed(1)}" y="${(mid + ffs + 1).toFixed(1)}" fill="${fill}" font-size="${ffs}" font-weight="${weight || 'bold'}" text-anchor="middle">${d}</text>`;
    x += fw;
    if (post) out += `<text x="${x.toFixed(1)}" y="${cy}" ${attrs}>${esc(post)}</text>`;
    return out;
  }
  function svgRectFrac(spec) {
    return `<svg viewBox="0 0 320 130" class="w-full max-w-[330px] h-auto">
      <rect x="75" y="25" width="160" height="75" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
      ${svgFracLabel(155, 68, '넓이 ', spec.area, ' m²', '#bae6fd', 14)}
      <line x1="75" y1="114" x2="235" y2="114" stroke="#fde047" stroke-width="2"/>
      <text x="155" y="127" fill="#fde047" font-size="13" font-weight="bold" text-anchor="middle">가로 = ? m</text>
      <line x1="248" y1="25" x2="248" y2="100" stroke="#f472b6" stroke-width="2"/>
      ${svgFracLabel(284, 66, '세로 ', spec.side, ' m', '#f472b6', 12)}</svg>`;
  }
  function renderDiagram(spec) {
    if (!spec) return '';
    switch (spec.kind) {
      case 'topNumbers': return svgTopNumbers(spec.grid, spec.arrow);
      case 'voxelTarget': return svgVoxelTarget(spec.footprint, spec.front, spec.side, spec.total);
      case 'views': return svgViews(spec.front, spec.side);
      case 'circle': return svgCircle(spec);
      case 'net': return svgNet(spec);
      case 'rotate': return svgRotate(spec);
      case 'proportion': return svgProportion(spec);
      case 'bridge': return svgBridge(spec);
      case 'rectFrac': return svgRectFrac(spec);
      default: return '';
    }
  }

  const api = {
    UNIT_NAMES, R, parseNum, rEq, show, fracStr, decStr, mixedStr, checkTyped, validateProblem, generate, Deck, renderDiagram,
    frontView, sideView, countSolutions, minMaxCount, TYPE_TABLE, TYPE_CODE, KIND_TYPES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MathDoorsBank = api;
})(typeof window !== 'undefined' ? window : globalThis);
