/* NEXT ROOM — 4~6학년 단원(4-1 ~ 6-1) 문제 생성기 검사 (Node.js)
 * 실행: node tests/grade_units_test.js
 * 1) 단원 30개 × 유형(A 연결·C 카드·E 가짜 문·F 장치) 문제를 대량 생성해 구조 검사(validateProblem) 통과
 * 2) 정답을 생성기와 따로 다시 계산해 비교
 *    - '식 = □' 문제: 이 파일의 유리수 계산기로 식을 직접 계산
 *    - 문장제: 이 파일에 따로 적은 공식(params 사용)으로 계산
 * 3) 숫자·낱말 뒤 조사(을/를, 은/는, 이/가, 과/와) 검사
 * 4) 학년별·섞은 단원 선택으로 덱을 뽑아 대체 문항(fallback) 없음, 같은 문제 반복 없음, 옷장 문제 생성
 */
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'js', 'v5-core.js'));
global.NextRoomCore = C;
const B = require(path.join(__dirname, '..', 'assets', 'js', 'math-bank-v5.js'));
global.NextRoomBank = B;
const G = require(path.join(__dirname, '..', 'assets', 'js', 'math-bank-grades.js'));
let failures = 0, checked = 0, exprChecked = 0, wordChecked = 0;
const KINDS = {};
const fail = m => { failures++; const k = m.split(' ').slice(0, 2).join(' '); KINDS[k] = (KINDS[k] || 0) + 1; if (KINDS[k] <= 2) console.log('FAIL', m); };

// ---------- independent rationals ----------
const g = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const k = g(n, d); return [n / k, d / k]; };
const add = (x, y) => Q(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const sub = (x, y) => Q(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const mul = (x, y) => Q(x[0] * y[0], x[1] * y[1]);
const div = (x, y) => Q(x[0] * y[1], x[1] * y[0]);
const eq = (x, y) => x[0] === y[0] && x[1] === y[1];
const dec = s => { const [i, f = ''] = String(s).split('.'); return Q(+(i + f), 10 ** f.length); };

// ---------- tiny expression evaluator: numbers (12, 3.4, a/b, w과 a/b, 35만, 3억), + − × ÷ ( ) ----------
function evalExpr(src) {
  let s = src.replace(/°/g, '').replace(/^[^:]*:\s*/, '');
  const toks = [];
  const re = /\s*(?:(\d+)과\s*(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+(?:\.\d+)?)(억|만)?|([+−×÷()]))/y;
  let m;
  while (re.lastIndex < s.length) {
    m = re.exec(s);
    if (!m) { if (/^\s*$/.test(s.slice(re.lastIndex))) break; return null; }
    if (m[1]) toks.push(add(Q(+m[1]), Q(+m[2], +m[3])));
    else if (m[4]) toks.push(Q(+m[4], +m[5]));
    else if (m[6]) { let v = dec(m[6]); if (m[7] === '억') v = mul(v, Q(10000)); toks.push(v); }
    else toks.push(m[8]);
  }
  let i = 0;
  const prim = () => { const t = toks[i++]; if (t === '(') { const v = sum(); i++; return v; } return t; };
  const prod = () => { let v = prim(); while (toks[i] === '×' || toks[i] === '÷') { const o = toks[i++]; const w = prim(); v = o === '×' ? mul(v, w) : div(v, w); } return v; };
  const sum = () => { let v = prod(); while (toks[i] === '+' || toks[i] === '−') { const o = toks[i++]; const w = prod(); v = o === '+' ? add(v, w) : sub(v, w); } return v; };
  const v = sum();
  return i === toks.length ? v : null;
}

// ---------- independent formulas for word problems (gen → params → answer) ----------
const ndiv = n => { let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return c; };
const lcm = (a, b) => a / g(a, b) * b;
const W = {
  u411_place: ([a, b, c]) => Q(a * 10000 + b * 1000 + c * 100), u411_skip: ([s, k, t]) => Q(s + k * t),
  u411_digit: ([num, pos]) => Q(+num[num.length - 1 - pos] * 10 ** pos),
  u412_tri: ([a, b]) => Q(180 - a - b), u412_quad: ([a, b, c]) => Q(360 - a - b - c), u412_clock: ([h]) => Q(30 * h),
  u413_rem: ([a, d]) => Q(a % d), u413_word: ([t, n]) => Q(t / n),
  u414_turn: ([a]) => Q(360 - a), u414_turns: ([k]) => Q(90 * k), u414_slide: ([a, c]) => Q(a + c), u414_flip: () => Q(2), u414_turn4: () => Q(4), u414_twice: ([a, b]) => Q(a + b),
  u415_read: ([k, n]) => Q(k * n), u415_cells: ([k, n]) => Q(n), u415_diff: ([k, a, b]) => Q((a - b) * k), u415_total: ([a, b, c, t]) => Q(t - a - b - c), u415_maxmin: ([k, mx, mn]) => Q((mx + mn) * k),
  u416_arith: ([s, d]) => Q(s + 4 * d), u416_geo: ([s, m]) => Q(s * m ** 4), u416_square: ([n]) => Q(n * n), u416_table: ([s, k, n]) => Q(s + (n - 1) * k),
  u421_word: ([a, b, d]) => Q(a - b, d),
  u422_isoper: ([a, b]) => Q(2 * a + b), u422_eqside: ([s]) => Q(s), u422_base: ([a]) => Q(180 - a, 2), u422_apex: ([b]) => Q(180 - 2 * b), u422_eqper: ([s]) => Q(3 * s),
  u423_count: ([n]) => Q(n, 100), u423_kg: ([k, gr]) => add(Q(k), Q(gr, 1000)), u423_shift: ([a, big]) => big ? Q(a) : Q(a, 100),
  u424_paraper: ([a, b]) => Q(2 * (a + b)), u424_paraang: ([a]) => Q(180 - a), u424_rhper: ([s]) => Q(4 * s), u424_rhside: ([s]) => Q(s), u424_paraopp: ([a]) => Q(a),
  u425_change: ([k, n]) => Q(k * n), u425_rise: ([a, b]) => Q(b - a), u425_mid: ([a, d]) => Q(2 * a + d, 2), u425_cells: ([k, n]) => Q(n),
  u426_per: ([n, s]) => Q(n * s), u426_side: ([n, s]) => Q(s), u426_diag: ([n]) => Q(n * (n - 3), 2), u426_onevert: ([n]) => Q(n - 3), u426_vert: ([n]) => Q(2 * n),
  u512_ndiv: ([n]) => Q(ndiv(n)), u512_gcd: ([a, b]) => Q(g(a, b)), u512_lcm: ([a, b]) => Q(lcm(a, b)), u512_twodig: ([a]) => { let m = a; while (m < 10) m += a; return Q(m); }, u512_count: ([a, n]) => Q(Math.floor(n / a)),
  u513_chairs: ([k, a]) => Q(k * a), u513_age: ([k, a]) => Q(a + k), u513_table: ([k, a]) => Q(k * a), u513_addtable: ([k, a]) => Q(a + k), u513_reverse: ([k, a]) => Q(a),
  u514_reduce: ([x, y]) => Q(x, y), u514_lcd: ([a, b, c, d]) => Q(lcm(b, d)), u514_equiv: ([a, b, k]) => Q(a * k), u514_dec2frac: ([n]) => Q(n, 100),
  u514_compare: ([a, b, c, d]) => { const x = Q(a, b), y = Q(c, d); return x[0] * y[1] > y[0] * x[1] ? x : y; },
  u515_word: ([a, b, c, d]) => add(Q(a, b), Q(c, d)),
  u516_rect: ([a, b]) => Q(a * b), u516_rectper: ([a, b]) => Q(2 * (a + b)), u516_para: ([a, h]) => Q(a * h), u516_tri: ([a, h]) => Q(a * h, 2), u516_trap: ([a, b, h]) => Q((a + b) * h, 2), u516_rhom: ([p, q]) => Q(p * q, 2), u516_sq: ([s]) => Q(s),
  u521_round10: ([n]) => Q(Math.round(n / 10) * 10), u521_ceil100: ([n]) => Q(Math.ceil(n / 100) * 100), u521_floor1000: ([n]) => Q(Math.floor(n / 1000) * 1000), u521_incl: ([a, b]) => Q(b - a + 1), u521_excl: ([a, b]) => Q(b - a - 1), u521_bus: ([k, n]) => Q(Math.ceil(n / k)),
  u522_of: ([n, a, b]) => Q(n * a, b),
  u523_corr: ([a, b]) => Q(180 - a - b), u523_center: ([d]) => Q(d, 2), u523_axes: ([n]) => Q(n), u523_iso: ([b]) => Q(180 - 2 * b), u523_perim: ([p]) => Q(p),
  u525_parts: ([k]) => Q({ 면: 6, 모서리: 12, 꼭짓점: 8 }[k]), u525_edges: ([a, b, c]) => Q(4 * (a + b + c)), u525_cubeEdges: ([s]) => Q(12 * s), u525_cubeSide: ([s]) => Q(s),
  u525_fact: ([k]) => Q(/수직/.test(k) ? 4 : /만나는/.test(k) ? 3 : /보이지 않는/.test(k) ? 3 : /보이는 꼭짓점/.test(k) ? 7 : 1),
  u526_mean: xs => Q(xs.reduce((a, b) => a + b, 0), xs.length), u526_total: ([m, n]) => Q(m * n), u526_need: ([m, a, b, c]) => Q(4 * m - a - b - c), u526_sure: () => Q(1), u526_half: () => Q(1, 2),
  u611_word: ([a, n]) => Q(a, n),
  u612_prism0: ([n]) => Q(n + 2), u612_prism1: ([n]) => Q(3 * n), u612_prism2: ([n]) => Q(2 * n), u612_pyr0: ([n]) => Q(n + 1), u612_pyr1: ([n]) => Q(2 * n), u612_pyr2: ([n]) => Q(n + 1), u612_which: ([n]) => Q(n),
  u613_word: ([x, n]) => Q(x, 10 * n),
  u614_frac: ([a, b]) => Q(a, b), u614_topct: ([p]) => Q(p), u614_todec: ([p]) => Q(p, 100), u614_rate: ([n, k]) => Q(k * 100, n), u614_part: ([b, pct]) => Q(b * pct, 100), u614_base: ([a, b]) => Q(b),
  u615_count: ([n, pct]) => Q(n * pct, 100), u615_pct: ([n, k]) => Q(k * 100, n), u615_deg: ([pct]) => Q(pct * 360, 100), u615_pict: ([a, b]) => Q(10 * a + b), u615_band: ([pct]) => Q(20 * pct, 100),
  u616_vol: ([a, b, c]) => Q(a * b * c), u616_cubeVol: ([s]) => Q(s ** 3), u616_area: ([a, b, c]) => Q(2 * (a * b + b * c + c * a)), u616_cubeArea: ([s]) => Q(6 * s * s), u616_m3: ([k]) => Q(k * 1000000), u616_height: ([a, b, h]) => Q(h)
};

// ---------- particle check (independent of the generator's helper) ----------
function jongOf(t) {   // true = 받침 있음, 'r' = ㄹ받침
  const last = t[t.length - 1], code = last.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) { const j = (code - 0xAC00) % 28; return j === 0 ? false : (j === 8 ? 'r' : true); }
  if (/\d/.test(last)) return ['0', '1', '3', '6', '7', '8'].includes(last) ? (['1', '7', '8'].includes(last) ? 'r' : true) : false;
  return null;
}
function particleErrors(q) {
  const errs = [];
  // 수 뒤 조사: 분수 a/b는 분자 a로 읽힘 끝
  // 대분수 표기 'w과 a/b'는 화면에서 자연수 + 세로 분수로 그려져 '과'가 보이지 않으므로 제외
  q = q.replace(/\d+과 \d+\/\d+/g, '#');
  const re = /(\d+(?:\.\d+)?(?:\/(\d+))?)(을|를|이|가|은|는|과|와)(?=[ .,)])/g;
  let m;
  while ((m = re.exec(q))) {
    const tok = m[1], frac = m[2] !== undefined;
    const readEnd = frac ? tok.split('/')[0] : tok;
    const j = jongOf(readEnd);
    const p = m[3];
    const want = { 을: !!j, 를: !j, 이: !!j, 가: !j, 은: !!j, 는: !j, 과: !!j, 와: !j }[p];
    if (!want) errs.push(`조사 '${tok}${p}'`);
  }
  if (/모서리은|면는|꼭짓점는|모서리이 /.test(q)) errs.push('낱말 조사');
  return errs;
}

// ---------- 1~3) generate and check ----------
const ids = Object.keys(G.units).map(Number);
if (ids.length !== 30) fail('expected 30 new units, got ' + ids.length);
for (const id of ids) {
  const u = G.units[id];
  if (!B.UNIT_NAMES[id] || !B.UNIT_GRADE[id]) fail(id + ' not registered');
  for (const code of ['A', 'C', 'E', 'F']) {
    if (!B.TYPE_TABLE[id][code]) continue;
    let ok = 0;
    for (let i = 0; i < 400; i++) {
      const p = B.generate(id, code, C.makeRng('gt', id, code, i));
      if (!p) continue;
      const e = B.validateProblem(p);
      if (e.length) { fail(`${id} ${code} ${e.join('; ')} :: ${p.q}`); continue; }
      ok++;
    }
    if (ok < 200) fail(`${id} ${code}: only ${ok}/400 valid problems`);
  }
  for (let v = 0; v < u.variants; v++) {
    let made = 0;
    for (let i = 0; i < 600; i++) {
      const c = u.core(C.makeRng('gv', id, v, i), v);
      if (!c) continue;
      made++; checked++;
      const ans = [c.ans.n, c.ans.d];
      if (c.q.length > 70) fail(`${c.gen} question too long (${c.q.length})`);
      particleErrors(c.q).forEach(e => fail(`${c.gen} ${e} :: ${c.q}`));
      if (/= □\s*(\(소수로\))?$/.test(c.q)) {
        const left = c.q.replace(/\s*=\s*□.*$/, '');
        const val = evalExpr(left);
        if (!val) fail(`${c.gen} could not parse: ${left}`);
        else { exprChecked++; if (!eq(val, ans)) fail(`${c.gen} ${left} = ${val.join('/')} but generator says ${ans.join('/')}`); }
      } else if (W[c.gen]) {
        wordChecked++;
        const want = W[c.gen](c.params);
        if (!eq(want, ans)) fail(`${c.gen} params ${JSON.stringify(c.params)} → ${want.join('/')} but generator says ${ans.join('/')} :: ${c.q}`);
      } else fail(`${c.gen} has no independent check`);
      const shown = B.util.show(c.ans, c.mode);
      if (!B.checkTyped(c.ans, shown)) fail(`${c.gen} displayed answer ${shown} does not parse back`);
    }
    if (made < 100) fail(`${id} v${v}: only ${made}/600 generated`);
  }
}

// ---------- 4) decks ----------
const SETS = G.GRADE_GROUPS.map(([gr, us]) => us).concat([[411, 521, 616], [413, 1, 614], ids, ids.concat([1, 2, 3, 4, 5, 6])]);
let decks = 0;
for (const units of SETS) for (let seed = 1; seed <= 12; seed++) {
  const deck = new B.Deck(units, seed * 7919);
  const sigs = new Set();
  for (let door = 1; door <= 30; door++) {
    for (const kind of ['door', 'decoy', 'bridge', 'terminal']) {
      const p = deck.draw(kind, door * 10 + ['door', 'decoy', 'bridge', 'terminal'].indexOf(kind));
      if (p.fallback) fail(`fallback problem for units ${units.join(',')} kind ${kind}`);
      if (!units.includes(p.unit)) fail(`unit ${p.unit} not selected (${units.join(',')})`);
      if (sigs.has(p.sig)) fail('repeated problem ' + p.sig);
      sigs.add(p.sig);
      if (kind === 'decoy' && p.type !== 'typeE_decoy') fail('decoy kind without decoy type');
    }
  }
  for (let k = 0; k < 15; k++) {
    const d = deck.drawDefense();
    if (!units.includes(d.unit) || d.id === 'def_fallback') fail(`defense fallback/unit for ${units.join(',')}`);
    if (d.choices.length !== 3 || !d.choices.includes(d.a)) fail('defense choices ' + JSON.stringify(d));
  }
  decks++;
}

console.log(`checked ${checked} generated questions (${exprChecked} expressions recomputed, ${wordChecked} word problems recomputed), ${decks} decks × 120 draws`);
if (failures) { console.log('FAILED', failures, JSON.stringify(KINDS)); process.exit(1); }
console.log('PASS: 30 new units (4-1 ~ 6-1) — structure, independent answers, particles, decks');
