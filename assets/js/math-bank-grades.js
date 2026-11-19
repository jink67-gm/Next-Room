/* NEXT ROOM — 4~6학년 수학 문제 생성기 (2022 개정 교육과정 학년·학기별 학습 내용)
 * 4-1 · 4-2 · 5-1 · 5-2 · 6-1 (학습 내용 30개). 6-2는 math-bank-v5.js의 기존 내용(번호 1~6)을 그대로 쓴다.
 * 문제는 모두 직접 만든 틀에 무작위 수를 넣어 만든다(교과서·자습서 문제를 옮기지 않음). 이름도 일반적인 수학 개념 이름을 쓴다.
 * 내부 번호: 학년×100 + 학기×10 + 일련번호 (예: 411). 화면 표시 순서는 GRADE_GROUPS를 따른다.
 * 각 단원은 '숫자 답' 문제 생성기(core)를 여러 변형으로 가지고, math-bank-v5.js의 registerUnit이
 * 같은 생성기로 연결(A)·카드(C)·가짜 문(E)·장치(F)·옷장 걸쇠/책 꽂기 문제를 만든다.
 * - 정답은 유리수(분자/분모)로 계산한다. 답은 항상 0보다 크다.
 * - 4학년 분수 문제는 약분하지 않아도 되는 수만 쓴다(약분은 5-1에서 배움).
 */
(function (root) {
  'use strict';
  const Bank = root.NextRoomBank || (typeof require !== 'undefined' ? require('./math-bank-v5.js') : null);
  const { R, rAdd, rSub, rMul, rDiv, gcd, isInt, decStr, fracStr, D } = Bank.util;
  const lcm = (a, b) => a / gcd(a, b) * b;
  const N = n => R(n, 1);

  // core 만들기: unit, gen, params, 문제, 힌트, 답(유리수), 오답 후보, 추가 옵션(mode·unitLabel)
  function mk(unit, gen, params, q, hint, ans, distract, extra) {
    if (!ans || ans.n <= 0) return null;
    let ds = (distract || []).filter(x => x && x.n > 0);
    // 답이 자연수이고 소수 문제가 아니면 오답 보기도 자연수만 (예: 혼합 계산에 13/2 같은 보기가 나오지 않게)
    if (isInt(ans) && !(extra && extra.mode === 'dec')) ds = ds.filter(isInt);
    return Object.assign({ unit, gen: 'u' + unit + '_' + gen, params, q, hint, ans, distract: ds }, extra || {});
  }
  const DEC = { mode: 'dec' };
  const MIX = { mode: 'mixed' };
  const unitL = (u, more) => Object.assign({ unitLabel: u }, more || {});
  const mixedTxt = (w, n, d) => (w ? w + '과 ' : '') + n + '/' + d;
  // 수·낱말 뒤 조사 (받침 유무): 분수 a/b는 'b분의 a'로 읽으므로 분자 a를 본다. 0으로 끝나는 수는 십·백·천·만(받침 있음)
  function hasJong(x) {
    const t = String(x).trim();
    const last = t[t.length - 1];
    const code = last.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28;   // 0이면 받침 없음, 8이면 ㄹ
    if (/\d/.test(last)) return ({ 0: 21, 1: 8, 2: 0, 3: 16, 4: 0, 5: 0, 6: 1, 7: 8, 8: 8, 9: 0 })[last];
    return 0;
  }
  const PAIRS = { 을: ['을', '를'], 를: ['을', '를'], 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'], 로: ['으로', '로'], 으로: ['으로', '로'] };
  // J(값, 조사[, 읽을 때 마지막에 오는 값]) → 값 + 알맞은 조사
  function J(x, p, readAs) {
    const jong = hasJong(readAs !== undefined ? readAs : x), pr = PAIRS[p];
    const useFirst = p === '로' || p === '으로' ? (jong && jong !== 8) : !!jong;
    return x + (useFirst ? pr[0] : pr[1]);
  }
  const units = {};
  function U(id, grade, name, variants, expr, hint, core, cexpr) { units[id] = { grade, name, variants, expr, hint, core, cexpr }; }

  // =========================================================== 4학년 1학기
  U(411, '4-1', '큰 수 (만·억·조)', 5, [0, 1], '만, 억 단위로 끊어 자릿값을 생각해 보세요.', (r, v) => {
    const u = 411;
    if (v === 0) { const a = r.int(12, 79), b = r.int(11, 69); return mk(u, 'addman', [a, b], `${a}만 + ${b}만 = □`, '만이 몇 개인지 더합니다.', N(a + b), [N(a + b + 10), N(Math.abs(a - b) || 1), N(a + b - 1)], unitL('만')); }
    if (v === 1) { const a = r.int(2, 9), b = r.int(1, 9) * 1000; return mk(u, 'subeok', [a, b], `${a}억 − ${b}만 = □`, '1억 = 10000만 입니다.', N(a * 10000 - b), [N(a * 1000 - b / 10), N(a * 10000 + b), N((a - 1) * 10000)], unitL('만')); }
    if (v === 2) { const a = r.int(2, 9), b = r.int(0, 9), c = r.int(1, 9); return mk(u, 'place', [a, b, c], `10000이 ${a}개, 1000이 ${b}개, 100이 ${c}개인 수는 □입니다.`, '각 자리의 숫자를 차례로 써 봅니다.', N(a * 10000 + b * 1000 + c * 100), [N(a * 1000 + b * 100 + c * 10), N(a * 100000 + b * 1000 + c * 100), N(a * 10000 + b * 100 + c * 1000)]); }
    if (v === 3) { const s = r.int(10, 90), k = r.pick([5, 10, 20, 50]), t = r.int(3, 5); return mk(u, 'skip', [s, k, t], `${s}만에서 ${k}만씩 ${t}번 뛰어 센 수는 □입니다.`, `${k}만씩 ${t}번 더합니다.`, N(s + k * t), [N(s + k * (t - 1)), N(s + k * (t + 1)), N(s * t)], unitL('만')); }
    // 숫자가 나타내는 값
    const digs = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 7), pos = r.int(3, 6), d = digs[6 - pos];
    const num = digs.join('');
    return mk(u, 'digit', [num, pos], `${num}에서 숫자 ${J(d, '가')} 나타내는 값은 □입니다.`, '오른쪽부터 일, 십, 백, 천, 만… 자리입니다.', N(d * 10 ** pos), [N(d * 10 ** (pos - 1)), N(d * 10 ** (pos + 1)), N(d)]);
  });

  U(412, '4-1', '각도와 삼각형·사각형의 각', 5, [0, 1], '삼각형의 세 각의 합은 180°, 사각형은 360°입니다.', (r, v) => {
    const u = 412;
    if (v === 0) { const a = r.int(4, 30) * 5, b = r.int(3, 30) * 5; if (a + b >= 360) return null; return mk(u, 'add', [a, b], `${a}° + ${b}° = □`, '각도도 자연수처럼 더합니다.', N(a + b), [N(a + b + 10), N(Math.abs(a - b)), N(a + b - 10)], unitL('°')); }
    if (v === 1) { const a = r.int(20, 70) * 5, b = r.int(3, 30) * 5; if (b >= a) return null; return mk(u, 'sub', [a, b], `${a}° − ${b}° = □`, '각도도 자연수처럼 뺍니다.', N(a - b), [N(a + b), N(a - b + 10), N(a - b - 10)], unitL('°')); }
    if (v === 2) { const a = r.int(4, 18) * 5, b = r.int(4, 18) * 5; if (a + b >= 175) return null; return mk(u, 'tri', [a, b], `삼각형의 두 각이 ${a}°, ${b}°일 때 나머지 한 각은 □입니다.`, '삼각형의 세 각의 합은 180°입니다.', N(180 - a - b), [N(360 - a - b), N(a + b), N(180 - a)], unitL('°')); }
    if (v === 3) { const a = r.int(12, 30) * 5, b = r.int(12, 30) * 5, c = r.int(12, 24) * 5; const d = 360 - a - b - c; if (d < 30 || d > 170) return null; return mk(u, 'quad', [a, b, c], `사각형의 세 각이 ${a}°, ${b}°, ${c}°일 때 나머지 한 각은 □입니다.`, '사각형의 네 각의 합은 360°입니다.', N(d), [N(180 - a - b - c > 0 ? 180 - a - b - c : d + 20), N(d + 10), N(d - 10)], unitL('°')); }
    const h = r.int(1, 5); return mk(u, 'clock', [h], `시계가 ${h}시를 가리킬 때 긴바늘과 짧은바늘이 이루는 작은 쪽의 각은 □입니다.`, '숫자 한 칸 사이의 각은 30°입니다.', N(30 * h), [N(15 * h), N(360 - 30 * h), N(30 * h + 30)], unitL('°'));
  });

  U(413, '4-1', '세 자리 수의 곱셈과 나눗셈', 5, [0, 1, 2], '세 자리 수 × 두 자리 수는 일의 자리, 십의 자리를 나누어 곱합니다.', (r, v) => {
    const u = 413;
    if (v === 0) { const a = r.int(101, 999), b = r.int(12, 98); if (b % 10 === 0) return null; return mk(u, 'mul', [a, b], `${a} × ${b} = □`, '일의 자리와 십의 자리를 따로 곱해 더합니다.', N(a * b), [N(a * b + a), N(a * (b % 10) + a * Math.floor(b / 10)), N(a * b - 10)]); }
    if (v === 1) { const a = r.int(101, 999), b = r.int(2, 9) * 10; return mk(u, 'mul0', [a, b], `${a} × ${b} = □`, `${a} × ${J(b / 10, '를')} 계산한 뒤 0을 하나 붙입니다.`, N(a * b), [N(a * b / 10), N(a * b * 10), N(a * b + b)]); }
    if (v === 2) { const d = r.int(12, 49), q = r.int(3, 29), a = d * q; if (a < 100 || a > 999 || d % 10 === 0) return null; return mk(u, 'div', [a, d], `${a} ÷ ${d} = □`, `${d}에 몇을 곱해야 ${J(a, '가')} 되는지 어림해 봅니다.`, N(q), [N(q + 1), N(q - 1), N(q * 10)]); }
    if (v === 3) { const d = r.int(12, 39), q = r.int(4, 25), m = r.int(1, d - 1), a = d * q + m; if (a > 999 || d % 10 === 0) return null; return mk(u, 'rem', [a, d], `${a} ÷ ${d}의 나머지는 □입니다.`, `몫은 ${q}입니다. 나머지는 나누는 수보다 작아요.`, N(m), [N(q), N(d - m === m ? m + 1 : d - m), N(m + d)]); }
    const n = r.int(12, 35), q = r.int(5, 25), t = n * q; if (t > 999) return null;
    return mk(u, 'word', [t, n], `구슬 ${t}개를 ${n}명에게 똑같이 나누어 주면 한 명은 □개를 받습니다.`, '전체 ÷ 사람 수', N(q), [N(q + 1), N(t - n), N(q * 10)], unitL('개'));
  });

  U(414, '4-1', '밀기·뒤집기·돌리기', 5, [], '돌리기: 시계 방향 90° = 시계 반대 방향 270°', (r, v) => {
    const u = 414;
    if (v === 0) { const a = r.pick([90, 180, 270]); return mk(u, 'turn', [a], `시계 반대 방향으로 ${a}°만큼 돌린 도형은 시계 방향으로 □만큼 돌린 도형과 같습니다.`, '한 바퀴는 360°입니다.', N(360 - a), [N(a), N(a + 90 > 360 ? 90 : a + 90), N(180 + 90 * (a === 90 ? 1 : 0))], unitL('°')); }
    if (v === 1) { const k = r.int(2, 7); return mk(u, 'turns', [k], `도형을 시계 방향으로 90°씩 ${k}번 돌리면 모두 □만큼 돌린 것입니다.`, '90° × 돌린 횟수', N(90 * k), [N(90 * (k - 1)), N(180 * k), N(90 + k)], unitL('°')); }
    if (v === 2) { const a = r.int(1, 6), c = r.int(2, 7); return mk(u, 'slide', [a, c], `왼쪽에서 ${a}번째 칸에 있는 도형을 오른쪽으로 ${c}칸 밀면 왼쪽에서 □번째 칸에 놓입니다.`, '밀기는 모양은 그대로, 위치만 바뀝니다.', N(a + c), [N(a + c - 1), N(c), N(a + c + 1)]); }
    if (v === 3) { const flip = r.chance(0.5); return flip
      ? mk(u, 'flip', [1], '도형을 같은 방향으로 계속 뒤집을 때 처음 모양과 같아지는 가장 적은 횟수는 □번입니다.', '같은 방향으로 두 번 뒤집으면 처음 모양이 됩니다.', N(2), [N(1), N(4), N(3)])
      : mk(u, 'turn4', [1], '도형을 시계 방향으로 90°씩 돌릴 때 처음 모양과 같아지는 가장 적은 횟수는 □번입니다.', '90° × 4 = 360° (한 바퀴)', N(4), [N(2), N(3), N(90)]); }
    const a = r.pick([90, 180]), b = r.pick([90, 180, 270]); if (a + b > 360) return null; return mk(u, 'twice', [a, b], `도형을 시계 방향으로 ${a}° 돌린 다음 다시 시계 방향으로 ${b}° 돌리면 모두 □만큼 돌린 것입니다.`, '두 번 돌린 각도를 더합니다.', N(a + b), [N(Math.abs(b - a) || 360), N(a + b + 90), N(a * b / 90)], unitL('°'));
  });

  U(415, '4-1', '막대그래프 읽기', 5, [], '세로 눈금 한 칸이 나타내는 수를 먼저 확인합니다.', (r, v) => {
    const u = 415;
    if (v === 0) { const k = r.pick([2, 5, 10]), n = r.int(3, 12); return mk(u, 'read', [k, n], `세로 눈금 한 칸이 ${k}명인 막대그래프에서 막대가 ${n}칸이면 □명입니다.`, '칸 수 × 한 칸의 크기', N(k * n), [N(n), N(k + n), N(k * (n + 1))], unitL('명')); }
    if (v === 1) { const k = r.pick([2, 5, 10]), n = r.int(3, 12); return mk(u, 'cells', [k, n], `세로 눈금 한 칸이 ${k}명일 때 ${k * n}명은 막대 □칸으로 나타냅니다.`, '전체 ÷ 한 칸의 크기', N(n), [N(k * n), N(n + k), N(n * 2)], unitL('칸')); }
    if (v === 2) { const k = r.pick([2, 5]), a = r.int(6, 14), b = r.int(2, a - 2); return mk(u, 'diff', [k, a, b], `한 칸이 ${k}명일 때 ${a}칸인 막대와 ${b}칸인 막대는 □명 차이 납니다.`, '칸 수의 차 × 한 칸의 크기', N((a - b) * k), [N(a - b), N((a + b) * k), N((a - b) * k + k)], unitL('명')); }
    if (v === 3) { const a = r.int(15, 30), b = r.int(15, 30), c = r.int(15, 30), d = r.int(15, 30), t = a + b + c + d; return mk(u, 'total', [a, b, c, t], `네 반의 학생 수 합계가 ${t}명입니다. 세 반이 ${a}명, ${b}명, ${c}명이면 나머지 반은 □명입니다.`, '합계 − 세 반의 합', N(d), [N(d + 1), N(t - a - b), N(d - 2)], unitL('명')); }
    const k = r.pick([2, 5, 10]), mx = r.int(8, 15), mn = r.int(2, mx - 3); return mk(u, 'maxmin', [k, mx, mn], `한 칸이 ${k}개일 때 가장 긴 막대가 ${mx}칸, 가장 짧은 막대가 ${mn}칸이면 두 수량의 합은 □개입니다.`, '각 막대가 나타내는 수를 구해 더합니다.', N((mx + mn) * k), [N(mx + mn), N((mx - mn) * k), N(mx * k)], unitL('개'));
  });

  U(416, '4-1', '수의 배열에서 규칙 찾기', 5, [0, 1], '수가 얼마씩 커지는지(몇 배가 되는지) 찾아봅니다.', (r, v) => {
    const u = 416;
    if (v === 0) { const s = r.int(2, 30), d = r.int(3, 25); const seq = [0, 1, 2, 3].map(i => s + d * i).join(', '); return mk(u, 'arith', [s, d], `${seq}, □`, `${d}씩 커지는 규칙입니다.`, N(s + 4 * d), [N(s + 3 * d + 1), N(s + 5 * d), N(s + 4 * d - 1)]); }
    if (v === 1) { const s = r.int(1, 5), m = r.pick([2, 3]); const seq = [0, 1, 2, 3].map(i => s * m ** i).join(', '); return mk(u, 'geo', [s, m], `${seq}, □`, `${m}배씩 커지는 규칙입니다.`, N(s * m ** 4), [N(s * m ** 3 + s * m ** 3 - s * m ** 2), N(s * m ** 4 + m), N(s * m ** 3 * 2 === s * m ** 4 ? s * m ** 4 + 1 : s * m ** 3 * 2)]); }
    if (v === 2) { const n = r.int(4, 9); return mk(u, 'square', [n], `바둑돌을 한 변에 ${n}개씩 놓아 꽉 찬 정사각형 모양을 만들면 바둑돌은 모두 □개입니다.`, '가로 개수 × 세로 개수', N(n * n), [N(4 * n), N(n * n - n), N(2 * n)], unitL('개')); }
    if (v === 3) { const s = r.int(101, 120), k = r.pick([10, 100, 11]), n = r.int(4, 7); return mk(u, 'table', [s, k, n], `수 배열표에서 오른쪽으로 한 칸 갈 때마다 ${k}씩 커집니다. 첫 수가 ${s}이면 ${n}번째 수는 □입니다.`, `첫 수에 ${J(k, '를')} ${n - 1}번 더합니다.`, N(s + (n - 1) * k), [N(s + n * k), N(s + (n - 2) * k), N(s * n)]); }
    const n = r.int(3, 6); const lhs = Array.from({ length: n }, (_, i) => 2 * i + 1).join(' + ');
    return mk(u, 'odd', [n], `1부터 연속된 홀수의 합: ${lhs} = □`, `1부터 홀수 ${n}개의 합은 ${n} × ${n}입니다.`, N(n * n), [N(n * n + 1), N(n * (n + 1)), N(2 * n + 1)]);
  }, [4]);

  // =========================================================== 4학년 2학기
  U(421, '4-2', '분모가 같은 분수의 덧셈·뺄셈', 5, [0, 1, 3], '분모가 같으면 분자끼리 계산합니다. 답은 대분수나 가분수로 써도 돼요.', (r, v) => {
    const u = 421;
    const okD = (n, d) => gcd(n, d) === 1 || n % d === 0;   // 4학년: 약분이 필요 없는 수만
    if (v === 0) { const d = r.int(5, 12), a = r.int(1, d - 1), b = r.int(1, d - 1); if (!okD(a + b, d)) return null; return mk(u, 'add', [a, b, d], `${a}/${d} + ${b}/${d} = □`, '분모는 그대로, 분자끼리 더합니다.', R(a + b, d), [R(a + b, d + d), R(Math.abs(a - b) || 1, d), R(a + b + 1, d)], MIX); }
    if (v === 1) { const d = r.int(5, 12), a = r.int(3, d - 1), b = r.int(1, a - 1); if (!okD(a - b, d)) return null; return mk(u, 'sub', [a, b, d], `${a}/${d} − ${b}/${d} = □`, '분모는 그대로, 분자끼리 뺍니다.', R(a - b, d), [R(a + b, d), R(a - b, d + d), R(a - b + 1, d)], MIX); }
    if (v === 2) { const d = r.int(4, 9), w1 = r.int(1, 4), w2 = r.int(1, 3), a = r.int(1, d - 1), b = r.int(1, d - 1); const ans = R((w1 + w2) * d + a + b, d); if (!okD(a + b, d)) return null; return mk(u, 'mixadd', [w1, a, w2, b, d], `${mixedTxt(w1, a, d)} + ${mixedTxt(w2, b, d)} = □`, '자연수끼리, 분수끼리 더합니다.', ans, [R((w1 + w2) * d + a + b - d, d), R((w1 + w2 + 1) * d + a + b, d), R(w1 + w2, 1)], MIX); }
    if (v === 3) { const d = r.int(4, 11), a = r.int(1, d - 1); if (gcd(d - a, d) !== 1) return null; return mk(u, 'oneminus', [a, d], `1 − ${a}/${d} = □`, `1 = ${d}/${d} 로 바꾸어 뺍니다.`, R(d - a, d), [R(a, d), R(d - a, 2 * d), R(d - a + 1, d)], MIX); }
    const d = r.int(5, 12), a = r.int(4, d - 1), b = r.int(1, a - 2); if (!okD(a - b, d)) return null;
    return mk(u, 'word', [a, b, d], `리본 ${a}/${d} m 중에서 ${b}/${d} m를 사용하면 남은 리본은 □ m입니다.`, '처음 길이 − 사용한 길이', R(a - b, d), [R(a + b, d), R(a - b + 1, d), R(b, d)], Object.assign(unitL('m'), MIX));
  });

  U(422, '4-2', '이등변삼각형과 정삼각형', 5, [], '이등변삼각형은 두 변과 두 각이 같고, 정삼각형은 세 변과 세 각이 같습니다.', (r, v) => {
    const u = 422;
    if (v === 0) { const a = r.int(5, 15), b = r.int(3, 12); if (a === b || b >= 2 * a) return null; return mk(u, 'isoper', [a, b], `길이가 같은 두 변이 ${a} cm, 나머지 한 변이 ${b} cm인 이등변삼각형의 둘레는 □입니다.`, '같은 두 변 + 나머지 한 변', N(2 * a + b), [N(a + 2 * b), N(a + b), N(3 * a)], unitL('cm')); }
    if (v === 1) { const s = r.int(3, 16); return mk(u, 'eqside', [s], `둘레가 ${3 * s} cm인 정삼각형의 한 변은 □입니다.`, '정삼각형은 세 변의 길이가 같습니다.', N(s), [N(3 * s * 3), N(Math.round(3 * s / 2)), N(s + 3)], unitL('cm')); }
    if (v === 2) { const a = r.int(4, 32) * 5; if ((180 - a) % 2) return null; return mk(u, 'base', [a], `이등변삼각형에서 길이가 같은 두 변 사이의 각이 ${a}°이면 한 밑각은 □입니다.`, '두 밑각은 크기가 같고, 세 각의 합은 180°입니다.', N((180 - a) / 2), [N(180 - a), N(a), N((180 - a) / 2 + 10)], unitL('°')); }
    if (v === 3) { const b = r.int(5, 17) * 5; if (2 * b >= 180) return null; return mk(u, 'apex', [b], `이등변삼각형의 한 밑각이 ${b}°이면 나머지 한 각(꼭지각)은 □입니다.`, '180° − 두 밑각', N(180 - 2 * b), [N(180 - b), N(b), N(90 - b)], unitL('°')); }
    const s = r.int(3, 12); return mk(u, 'eqper', [s], `한 변이 ${s} cm인 정삼각형의 세 변의 길이의 합은 □입니다.`, '한 변 × 3', N(3 * s), [N(2 * s), N(4 * s), N(s + 3)], unitL('cm'));
  });

  U(423, '4-2', '소수 두 자리 수의 덧셈·뺄셈', 5, [0, 1], '소수점끼리 자리를 맞추어 계산합니다.', (r, v) => {
    const u = 423;
    if (v === 0) { const p = r.pick([1, 2]), a = r.int(11, 99 * (p === 2 ? 10 : 1)), b = r.int(11, 99 * (p === 2 ? 10 : 1)); if (a % 10 === 0 || b % 10 === 0) return null; return mk(u, 'add', [a, b, p], `${decStr(D(a, p))} + ${decStr(D(b, p))} = □`, '소수점 자리를 맞추어 더합니다.', D(a + b, p), [D(a + b, p + 1), D(a + b + 10 ** (p - 1) * 10, p), D(a + b - 1, p)], DEC); }
    if (v === 1) { const p = r.pick([1, 2]), a = r.int(30, 99 * (p === 2 ? 10 : 1)), b = r.int(11, a - 5); if (a % 10 === 0 || b % 10 === 0) return null; return mk(u, 'sub', [a, b, p], `${decStr(D(a, p))} − ${decStr(D(b, p))} = □`, '소수점 자리를 맞추어 뺍니다.', D(a - b, p), [D(a + b, p), D(a - b, p + 1), D(a - b + 1, p)], DEC); }
    if (v === 2) { const n = r.int(101, 999); if (n % 10 === 0) return null; return mk(u, 'count', [n], `0.01이 ${n}개인 수는 □입니다.`, '0.01이 100개이면 1입니다.', D(n, 2), [D(n, 1), D(n, 3), N(n)], DEC); }
    if (v === 3) { const k = r.int(1, 4), g = r.pick([150, 250, 300, 450, 600, 750, 800]); return mk(u, 'kg', [k, g], `${k} kg ${g} g은 □ kg입니다.`, '1000 g = 1 kg, 100 g = 0.1 kg', D(k * 1000 + g, 3), [D(k * 100 + g, 2), D(k * 10 + g / 10, 1), D(k * 1000 + g, 4)], DEC); }
    const a = r.int(11, 99); if (a % 10 === 0) return null; const big = r.chance(0.5);
    return mk(u, 'shift', [a, big ? 1 : 0], big ? `${decStr(D(a, 1))}의 10배는 □입니다.` : `${decStr(D(a, 1))}의 1/10은 □입니다.`, big ? '소수점이 오른쪽으로 한 자리 옮겨집니다.' : '소수점이 왼쪽으로 한 자리 옮겨집니다.', big ? N(a) : D(a, 2), big ? [D(a, 2), N(a * 10)] : [N(a), D(a, 3)], DEC);
  });

  U(424, '4-2', '평행사변형과 마름모', 5, [], '평행사변형은 마주 보는 변과 각이 같고, 이웃한 두 각의 합은 180°입니다.', (r, v) => {
    const u = 424;
    if (v === 0) { const a = r.int(4, 15), b = r.int(3, 12); if (a === b) return null; return mk(u, 'paraper', [a, b], `이웃한 두 변이 ${a} cm, ${b} cm인 평행사변형의 네 변의 길이의 합은 □입니다.`, '(두 변의 합) × 2', N(2 * (a + b)), [N(a + b), N(a * b), N(2 * (a + b) + 2)], unitL('cm')); }
    if (v === 1) { const a = r.int(9, 32) * 5; if (a === 90) return null; return mk(u, 'paraang', [a], `평행사변형의 한 각이 ${a}°일 때 이웃한 각은 □입니다.`, '이웃한 두 각의 합은 180°입니다.', N(180 - a), [N(a), N(360 - a), N(90 - a > 0 ? 90 - a : a - 90)], unitL('°')); }
    if (v === 2) { const s = r.int(3, 16); return mk(u, 'rhper', [s], `한 변이 ${s} cm인 마름모의 네 변의 길이의 합은 □입니다.`, '마름모는 네 변의 길이가 모두 같습니다.', N(4 * s), [N(2 * s), N(s * s), N(4 * s + 4)], unitL('cm')); }
    if (v === 3) { const s = r.int(3, 16); return mk(u, 'rhside', [s], `네 변의 길이의 합이 ${4 * s} cm인 마름모의 한 변은 □입니다.`, '둘레 ÷ 4', N(s), [N(2 * s), N(4 * s * 4), N(s + 2)], unitL('cm')); }
    const a = r.int(9, 32) * 5; if (a === 90) return null;
    return mk(u, 'paraopp', [a], `평행사변형에서 한 각이 ${a}°이면 그 각과 마주 보는 각은 □입니다.`, '평행사변형은 마주 보는 두 각의 크기가 같습니다.', N(a), [N(180 - a), N(360 - a), N(a + 10)], unitL('°'));
  });

  U(425, '4-2', '꺾은선그래프 읽기', 4, [], '세로 눈금 한 칸의 크기와 선이 기울어진 정도를 봅니다.', (r, v) => {
    const u = 425;
    if (v === 0) { const k = r.pick([1, 2, 5]), n = r.int(2, 9); return mk(u, 'change', [k, n], `세로 눈금 한 칸이 ${k}℃인 꺾은선그래프에서 선이 ${n}칸 올라갔다면 기온은 □℃ 올랐습니다.`, '칸 수 × 한 칸의 크기', N(k * n), [N(n), N(k + n), N(k * (n + 1))], unitL('℃')); }
    if (v === 1) { const a = r.int(8, 20), b = a + r.int(2, 12); return mk(u, 'rise', [a, b], `오전 9시에 ${a}℃, 오후 1시에 ${b}℃였다면 4시간 동안 기온이 □℃ 올랐습니다.`, '나중 기온 − 처음 기온', N(b - a), [N(a + b), N(b - a + 1), N(b)], unitL('℃')); }
    if (v === 2) { const a = r.int(120, 140), d = r.int(1, 4) * 2; return mk(u, 'mid', [a, d], `키가 3월에 ${a} cm, 5월에 ${a + d} cm였습니다. 일정하게 자랐다면 4월의 키는 약 □ cm입니다.`, '두 값의 가운데를 읽습니다.', N(a + d / 2), [N(a + d), N(a + 1 === a + d / 2 ? a + 2 : a + 1), N(a)], unitL('cm')); }
    const k = r.pick([2, 5]), n = r.int(3, 9); return mk(u, 'cells', [k, n], `세로 눈금 한 칸이 0.${k} kg일 때 ${decStr(D(k * n, 1))} kg의 차이는 □칸입니다.`, '차이 ÷ 한 칸의 크기', N(n), [N(n * 2), N(n + 1), N(k * n)], unitL('칸'));
  });

  U(426, '4-2', '다각형과 대각선', 5, [], '대각선은 서로 이웃하지 않은 두 꼭짓점을 이은 선분입니다.', (r, v) => {
    const u = 426;
    const NAME = { 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십' };
    if (v === 0) { const n = r.int(5, 10), s = r.int(3, 12); return mk(u, 'per', [n, s], `한 변이 ${s} cm인 정${NAME[n]}각형의 모든 변의 길이의 합은 □입니다.`, '한 변 × 변의 수', N(n * s), [N((n - 1) * s), N(n + s), N((n + 1) * s)], unitL('cm')); }
    if (v === 1) { const n = r.int(5, 10), s = r.int(3, 12); return mk(u, 'side', [n, s], `모든 변의 길이의 합이 ${n * s} cm인 정${NAME[n]}각형의 한 변은 □입니다.`, '둘레 ÷ 변의 수', N(s), [N(s * 2), N(n), N(s + 1)], unitL('cm')); }
    if (v === 2) { const n = r.int(4, 8); return mk(u, 'diag', [n], `${NAME[n]}각형에 그을 수 있는 대각선은 모두 □개입니다.`, '한 꼭짓점에서 (꼭짓점 수 − 3)개씩 그을 수 있고, 두 번씩 세어집니다.', N(n * (n - 3) / 2), [N(n * (n - 3)), N(n - 3), N(n * (n - 3) / 2 + 1)], unitL('개')); }
    if (v === 3) { const n = r.int(5, 10); return mk(u, 'onevert', [n], `${NAME[n]}각형의 한 꼭짓점에서 그을 수 있는 대각선은 □개입니다.`, '자기 자신과 이웃한 두 꼭짓점에는 그을 수 없습니다.', N(n - 3), [N(n - 1), N(n - 2), N(n)], unitL('개')); }
    const n = r.int(5, 10); return mk(u, 'vert', [n], `${NAME[n]}각형의 변의 수와 꼭짓점의 수를 더하면 □개입니다.`, '다각형은 변의 수와 꼭짓점의 수가 같습니다.', N(2 * n), [N(n), N(2 * n - 1), N(n + 3)], unitL('개'));
  });

  // =========================================================== 5학년 1학기
  U(511, '5-1', '덧셈·뺄셈·곱셈·나눗셈이 섞인 계산', 6, [0, 1, 2, 3, 4, 5], '( ) 안 → 곱셈·나눗셈 → 덧셈·뺄셈 순서로 계산합니다.', (r, v) => {
    const u = 511, h = '계산 순서: ( ) → ×, ÷ → +, −';
    if (v === 0) { const a = r.int(5, 40), b = r.int(2, 9), c = r.int(2, 9); return mk(u, 'aPbXc', [a, b, c], `${a} + ${b} × ${c} = □`, h, N(a + b * c), [N((a + b) * c), N(a + b + c), N(a * b + c)]); }
    if (v === 1) { const a = r.int(2, 15), b = r.int(2, 15), c = r.int(2, 9); return mk(u, 'paren', [a, b, c], `(${a} + ${b}) × ${c} = □`, h, N((a + b) * c), [N(a + b * c), N(a * c + b), N((a + b) * c + c)]); }
    if (v === 2) { const c = r.int(2, 9), q = r.int(2, 9), b = c * q, a = r.int(q + 3, 60); return mk(u, 'aMbDc', [a, b, c], `${a} − ${b} ÷ ${c} = □`, h, N(a - q), [R(a - b, c), N(a - b + c), N(a + q)]); }
    if (v === 3) { const a = r.int(3, 12), b = r.int(3, 9), d = r.int(2, 6), q = r.int(2, 8), c = d * q; if (a * b <= q) return null; return mk(u, 'aXbMcDd', [a, b, c, d], `${a} × ${b} − ${c} ÷ ${d} = □`, h, N(a * b - q), [R(a * b - c, d), N(a * b + q), N(a * (b - c) > 0 ? a * (b - c) : a * b)]); }
    if (v === 4) { const c = r.int(2, 6), q = r.int(2, 9), b = r.int(2, 20), a = b + c * q, d = r.int(2, 15); return mk(u, 'parenDiv', [a, b, c, d], `(${a} − ${b}) ÷ ${c} + ${d} = □`, h, N(q + d), [R(a - b, c + d), N(q * d), N(q + d + 1)]); }
    const a = r.int(5, 30), c = r.int(2, 9), b = c + r.int(1, 8), d = r.int(2, 6);
    return mk(u, 'aPparenX', [a, b, c, d], `${a} + (${b} − ${c}) × ${d} = □`, h, N(a + (b - c) * d), [N((a + b - c) * d), N(a + b - c * d > 0 ? a + b - c * d : 1), N(a + (b - c) + d)]);
  });

  U(512, '5-1', '약수·배수, 공약수·공배수', 5, [], '약수는 나누어떨어지게 하는 수, 배수는 몇 배 한 수입니다.', (r, v) => {
    const u = 512;
    const divs = n => { let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return c; };
    if (v === 0) { const n = r.pick([6, 8, 10, 12, 15, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48]); const c = divs(n); return mk(u, 'ndiv', [n], `${n}의 약수는 모두 □개입니다.`, `1과 ${n}도 약수입니다.`, N(c), [N(c - 1), N(c + 1), N(c - 2)], unitL('개')); }
    if (v === 1) { const g = r.int(2, 9), a = r.int(2, 7), b = r.int(2, 7); if (a === b || gcd(a, b) !== 1) return null; return mk(u, 'gcd', [g * a, g * b], `${J(g * a, '와')} ${g * b}의 최대공약수는 □입니다.`, '두 수의 공약수 중 가장 큰 수입니다.', N(g), [N(g * a * b), N(g * Math.min(a, b)), N(1)]); }
    if (v === 2) { const a = r.int(3, 12), b = r.int(3, 12); if (a === b) return null; const l = lcm(a, b); if (l > 120) return null; return mk(u, 'lcm', [a, b], `${J(a, '와')} ${b}의 최소공배수는 □입니다.`, '두 수의 공배수 중 가장 작은 수입니다.', N(l), [N(a * b === l ? l + Math.min(a, b) : a * b), N(gcd(a, b) === 1 ? l * 2 : gcd(a, b)), N(a + b)]); }
    if (v === 3) { const a = r.int(6, 19); const m = Math.ceil(10 / a) * a; return mk(u, 'twodig', [a], `${a}의 배수 중에서 가장 작은 두 자리 수는 □입니다.`, `${J(a, '를')} 1배, 2배… 해 봅니다.`, N(m), [N(m + a), N(a), N(10)]); }
    const a = r.int(3, 9), n = r.int(30, 99); return mk(u, 'count', [a, n], `1부터 ${n}까지의 자연수 중에서 ${a}의 배수는 □개입니다.`, `${n} ÷ ${a}의 몫을 생각합니다.`, N(Math.floor(n / a)), [N(Math.floor(n / a) + 1), N(Math.floor(n / a) - 1), N(a)], unitL('개'));
  });

  U(513, '5-1', '두 양 사이의 대응 관계', 5, [], '한 양이 변할 때 다른 양이 어떻게 변하는지 찾습니다.', (r, v) => {
    const u = 513;
    if (v === 0) { const k = r.int(2, 8), a = r.int(3, 12); return mk(u, 'chairs', [k, a], `탁자 한 개에 의자가 ${k}개씩 있습니다. 탁자가 ${a}개이면 의자는 □개입니다.`, '(의자 수) = (탁자 수) × ' + k, N(k * a), [N(k + a), N(k * (a + 1)), N(k * a - 1)], unitL('개')); }
    if (v === 1) { const k = r.int(2, 6), a = r.int(4, 12); return mk(u, 'age', [k, a], `형은 동생보다 ${k}살 많습니다. 동생이 ${a}살이면 형은 □살입니다.`, '(형의 나이) = (동생의 나이) + ' + k, N(a + k), [N(a - k > 0 ? a - k : a + k + 1), N(a * k), N(a + k + 1)], unitL('살')); }
    if (v === 2) { const k = r.int(3, 9), a = r.int(6, 15); return mk(u, 'table', [k, a], `○가 1, 2, 3일 때 ☆는 ${k}, ${2 * k}, ${3 * k}입니다. ○가 ${a}일 때 ☆는 □입니다.`, `☆ = ○ × ${k}`, N(k * a), [N(k + a), N(k * (a - 1)), N(3 * k + a)]); }
    if (v === 3) { const k = r.int(3, 9), a = r.int(6, 20); return mk(u, 'addtable', [k, a], `○가 1, 2, 3일 때 ☆는 ${1 + k}, ${2 + k}, ${3 + k}입니다. ○가 ${a}일 때 ☆는 □입니다.`, `☆ = ○ + ${k}`, N(a + k), [N(a * k), N(a + k + 1), N(a + k - 1)]); }
    const k = r.int(3, 9), a = r.int(4, 12); return mk(u, 'reverse', [k, a], `☆ = ○ × ${k}인 관계에서 ☆가 ${k * a}일 때 ○는 □입니다.`, `○ = ☆ ÷ ${k}`, N(a), [N(k * a * k), N(k * a - k), N(a + 1)]);
  });

  U(514, '5-1', '크기가 같은 분수, 약분·통분', 5, [], '분모와 분자를 공약수로 나누면 약분, 분모를 같게 만들면 통분입니다.', (r, v) => {
    const u = 514;
    if (v === 0) { const p = r.int(1, 8), q = r.int(p + 1, 12), g = r.int(2, 6); if (gcd(p, q) !== 1) return null; return mk(u, 'reduce', [p * g, q * g], `${p * g}/${J(q * g, '를', p * g)} 기약분수로 나타내면 □입니다.`, '분모와 분자를 최대공약수로 나눕니다.', R(p, q), [R(q, p), R(p + 1, q), R(p, q + 1)]); }
    if (v === 1) { const b = r.int(3, 12), d = r.int(3, 12); if (b === d || b % d === 0 || d % b === 0) return null; const a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null; return mk(u, 'lcd', [a, b, c, d], `${a}/${J(b, '와', a)} ${c}/${J(d, '를', c)} 통분할 때 가장 작은 공통분모는 □입니다.`, '두 분모의 최소공배수입니다.', N(lcm(b, d)), [N(b * d === lcm(b, d) ? b + d : b * d), N(Math.max(b, d)), N(lcm(b, d) * 2)]); }
    if (v === 2) { const a = r.int(1, 7), b = r.int(a + 1, 9), k = r.int(2, 6); if (gcd(a, b) !== 1) return null; return mk(u, 'equiv', [a, b, k], `${a}/${J(b, '와', a)} 크기가 같은 분수 중 분모가 ${b * k}인 분수의 분자는 □입니다.`, `분모에 ${J(k, '를')} 곱했으니 분자에도 ${J(k, '를')} 곱합니다.`, N(a * k), [N(a + k), N(a * k + 1), N(b * k - a)]); }
    if (v === 3) { const n = r.pick([2, 4, 5, 6, 8, 12, 15, 25, 35, 45, 75]); const f = R(n, 100); return mk(u, 'dec2frac', [n], `0.${J(String(n).padStart(2, '0'), '을')} 기약분수로 나타내면 □입니다.`, '소수 둘째 자리 → 분모 100으로 쓰고 약분합니다.', f, [R(n, 10), R(f.n + 1, f.d), R(f.n, f.d + 1)]); }
    const b = r.int(3, 9), d = r.int(3, 9); if (b === d) return null; const a = r.int(1, b - 1), c = r.int(1, d - 1); const x = R(a, b), y = R(c, d); if (x.n * y.d === y.n * x.d) return null;
    const big = x.n * y.d > y.n * x.d ? x : y, small = big === x ? y : x;
    return mk(u, 'compare', [a, b, c, d], `${a}/${J(b, '와', a)} ${c}/${d} 중에서 더 큰 수는 □입니다.`, '통분하여 분자의 크기를 비교합니다.', big, [small, R(a + c, b + d)]);
  });

  U(515, '5-1', '분모가 다른 분수의 덧셈·뺄셈', 5, [0, 1, 2, 3], '분모가 다르면 통분한 뒤 계산합니다. 답은 대분수나 가분수로 써도 돼요.', (r, v) => {
    const u = 515;
    if (v === 0) { const b = r.int(2, 9), d = r.int(2, 9); if (b === d) return null; const a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null; return mk(u, 'add', [a, b, c, d], `${a}/${b} + ${c}/${d} = □`, '두 분모의 최소공배수로 통분합니다.', rAdd(R(a, b), R(c, d)), [R(a + c, b + d), R(a + c, b * d), rAdd(R(a, b), R(c, d + 1))], MIX); }
    if (v === 1) { const b = r.int(2, 9), d = r.int(2, 9); if (b === d) return null; const a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null; const x = R(a, b), y = R(c, d); const ans = rSub(x, y); if (ans.n <= 0) return null; return mk(u, 'sub', [a, b, c, d], `${a}/${b} − ${c}/${d} = □`, '통분한 뒤 분자끼리 뺍니다.', ans, [R(Math.abs(a - c) || 1, Math.abs(b - d) || 1), rAdd(x, y), rSub(x, R(c, d + 1))], MIX); }
    if (v === 2) { const b = r.int(2, 6), d = r.int(2, 6); if (b === d) return null; const w1 = r.int(1, 3), w2 = r.int(1, 3), a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null; const ans = rAdd(R(w1 * b + a, b), R(w2 * d + c, d)); return mk(u, 'mixadd', [w1, a, b, w2, c, d], `${mixedTxt(w1, a, b)} + ${mixedTxt(w2, c, d)} = □`, '자연수끼리, 분수끼리 더합니다.', ans, [rSub(ans, N(1)), rAdd(ans, N(1)), R(w1 + w2, 1)], MIX); }
    if (v === 3) { const b = r.int(2, 6), d = r.int(2, 6); if (b === d) return null; const w1 = r.int(3, 5), w2 = r.int(1, 2), a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null; const ans = rSub(R(w1 * b + a, b), R(w2 * d + c, d)); if (ans.n <= 0) return null; return mk(u, 'mixsub', [w1, a, b, w2, c, d], `${mixedTxt(w1, a, b)} − ${mixedTxt(w2, c, d)} = □`, '분수끼리 뺄 수 없으면 1을 받아내림합니다.', ans, [rAdd(ans, N(1)), rSub(ans, R(1, b * d)), N(w1 - w2)], MIX); }
    const b = r.int(3, 8), d = r.int(3, 8); if (b === d) return null; const a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
    return mk(u, 'word', [a, b, c, d], `물 ${a}/${b} L와 주스 ${c}/${d} L를 섞으면 모두 □ L입니다.`, '통분하여 더합니다.', rAdd(R(a, b), R(c, d)), [R(a + c, b + d), R(a * c, b * d), rAdd(R(a, b), R(c, d + 1))], Object.assign(unitL('L'), MIX));
  });

  U(516, '5-1', '평면도형의 둘레와 넓이', 7, [], '평행사변형 = 밑변 × 높이, 삼각형 = 밑변 × 높이 ÷ 2', (r, v) => {
    const u = 516;
    if (v === 0) { const a = r.int(3, 15), b = r.int(2, 12); if (a === b) return null; return mk(u, 'rect', [a, b], `가로 ${a} cm, 세로 ${b} cm인 직사각형의 넓이는 □입니다.`, '가로 × 세로', N(a * b), [N(2 * (a + b)), N(a + b), N(a * b + a)], unitL('cm²')); }
    if (v === 1) { const a = r.int(3, 15), b = r.int(2, 12); if (a === b) return null; return mk(u, 'rectper', [a, b], `가로 ${a} cm, 세로 ${b} cm인 직사각형의 둘레는 □입니다.`, '(가로 + 세로) × 2', N(2 * (a + b)), [N(a * b), N(a + b), N(2 * a + b)], unitL('cm')); }
    if (v === 2) { const a = r.int(3, 14), h = r.int(2, 10); return mk(u, 'para', [a, h], `밑변이 ${a} cm, 높이가 ${h} cm인 평행사변형의 넓이는 □입니다.`, '밑변 × 높이', N(a * h), [R(a * h, 2), N(2 * (a + h)), N(a * h + h)], unitL('cm²')); }
    if (v === 3) { const a = r.int(3, 16), h = r.int(2, 12); if ((a * h) % 2) return null; return mk(u, 'tri', [a, h], `밑변이 ${a} cm, 높이가 ${h} cm인 삼각형의 넓이는 □입니다.`, '밑변 × 높이 ÷ 2', N(a * h / 2), [N(a * h), N(a + h), N(a * h / 2 + h)], unitL('cm²')); }
    if (v === 4) { const a = r.int(2, 9), b = r.int(a + 1, 14), h = r.int(2, 10); if (((a + b) * h) % 2) return null; return mk(u, 'trap', [a, b, h], `윗변 ${a} cm, 아랫변 ${b} cm, 높이 ${h} cm인 사다리꼴의 넓이는 □입니다.`, '(윗변 + 아랫변) × 높이 ÷ 2', N((a + b) * h / 2), [N((a + b) * h), N(a * b * h / 2 === (a + b) * h / 2 ? (a + b) * h / 2 + 1 : a * b * h / 2), N(a + b + h)], unitL('cm²')); }
    if (v === 5) { const p = r.int(3, 14), q = r.int(2, 12); if ((p * q) % 2 || p === q) return null; return mk(u, 'rhom', [p, q], `두 대각선이 ${p} cm, ${q} cm인 마름모의 넓이는 □입니다.`, '대각선 × 대각선 ÷ 2', N(p * q / 2), [N(p * q), N(p + q), N(2 * (p + q))], unitL('cm²')); }
    const s = r.int(3, 12); return mk(u, 'sq', [s], `넓이가 ${s * s} cm²인 정사각형의 한 변은 □입니다.`, '한 변 × 한 변 = 넓이', N(s), [N(s * s / 2 === Math.floor(s * s / 2) ? s * s / 2 : s + 2), N(s * 4), N(s + 1)], unitL('cm'));
  });

  // =========================================================== 5학년 2학기
  U(521, '5-2', '이상·이하·초과·미만과 올림·버림·반올림', 6, [], '반올림은 바로 아래 자리가 5 이상이면 올립니다.', (r, v) => {
    const u = 521;
    if (v === 0) { const n = r.int(1001, 9998); if (n % 10 === 0) return null; const up = Math.ceil(n / 10) * 10, dn = Math.floor(n / 10) * 10; const ans = n % 10 >= 5 ? up : dn; return mk(u, 'round10', [n], `${J(n, '을')} 반올림하여 십의 자리까지 나타내면 □입니다.`, '일의 자리 숫자를 봅니다.', N(ans), [N(ans === up ? dn : up), N(Math.round(n / 100) * 100), N(ans + 10)]); }
    if (v === 1) { const n = r.int(1001, 9998); if (n % 100 === 0) return null; const ans = Math.ceil(n / 100) * 100; return mk(u, 'ceil100', [n], `${J(n, '을')} 올림하여 백의 자리까지 나타내면 □입니다.`, '백의 자리 아래 수를 100으로 보고 올립니다.', N(ans), [N(Math.floor(n / 100) * 100), N(Math.ceil(n / 1000) * 1000), N(Math.ceil(n / 10) * 10)]); }
    if (v === 2) { const n = r.int(10001, 99998); if (n % 1000 === 0) return null; const ans = Math.floor(n / 1000) * 1000; return mk(u, 'floor1000', [n], `${J(n, '을')} 버림하여 천의 자리까지 나타내면 □입니다.`, '천의 자리 아래 수를 0으로 봅니다.', N(ans), [N(ans + 1000), N(Math.floor(n / 100) * 100), N(Math.floor(n / 10000) * 10000)]); }
    if (v === 3) { const a = r.int(10, 40), b = a + r.int(4, 15); return mk(u, 'incl', [a, b], `${a} 이상 ${b} 이하인 자연수는 모두 □개입니다.`, '이상, 이하는 그 수를 포함합니다.', N(b - a + 1), [N(b - a), N(b - a - 1), N(b - a + 2)], unitL('개')); }
    if (v === 4) { const a = r.int(10, 40), b = a + r.int(4, 15); return mk(u, 'excl', [a, b], `${a} 초과 ${b} 미만인 자연수는 모두 □개입니다.`, '초과, 미만은 그 수를 포함하지 않습니다.', N(b - a - 1), [N(b - a), N(b - a + 1), N(b - a - 2)], unitL('개')); }
    const k = r.pick([12, 15, 25, 30, 45]), n = r.int(40, 200); if (n % k === 0) return null;
    return mk(u, 'bus', [k, n], `학생 ${n}명이 모두 ${k}인승 버스를 타려면 버스는 적어도 □대 필요합니다.`, '남는 학생도 타야 하므로 올림합니다.', N(Math.ceil(n / k)), [N(Math.floor(n / k)), N(Math.ceil(n / k) + 1), N(Math.round(n / 10))], unitL('대'));
  });

  U(522, '5-2', '분수 × 자연수, 분수 × 분수', 5, [0, 1, 2, 3], '분자는 분자끼리, 분모는 분모끼리 곱합니다. 답은 대분수나 가분수로 써도 돼요.', (r, v) => {
    const u = 522;
    if (v === 0) { const b = r.int(2, 9), d = r.int(2, 9), a = r.int(1, b - 1), c = r.int(1, d - 1); if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null; return mk(u, 'ff', [a, b, c, d], `${a}/${b} × ${c}/${d} = □`, '분자끼리, 분모끼리 곱합니다.', rMul(R(a, b), R(c, d)), [R(a + c, b + d), rAdd(R(a, b), R(c, d)), R(a * d, b * c)], MIX); }
    if (v === 1) { const b = r.int(3, 9), a = r.int(1, b - 1), n = r.int(2, 12); if (gcd(a, b) !== 1) return null; return mk(u, 'nf', [n, a, b], `${n} × ${a}/${b} = □`, '자연수와 분자를 곱합니다.', rMul(N(n), R(a, b)), [R(a, n * b), R(n * a, b * b), R(n + a, b)], MIX); }
    if (v === 2) { const b = r.int(3, 9), a = r.int(1, b - 1), n = r.int(2, 12); if (gcd(a, b) !== 1) return null; return mk(u, 'fn', [a, b, n], `${a}/${b} × ${n} = □`, '분자와 자연수를 곱합니다.', rMul(N(n), R(a, b)), [R(a, n * b), R(a + n, b), R(n * a, b + n)], MIX); }
    if (v === 3) { const b = r.int(2, 6), w = r.int(1, 3), a = r.int(1, b - 1), n = r.int(2, 6); if (gcd(a, b) !== 1) return null; const x = R(w * b + a, b); return mk(u, 'mixn', [w, a, b, n], `${mixedTxt(w, a, b)} × ${n} = □`, '대분수를 가분수로 바꾸어 곱합니다.', rMul(x, N(n)), [R(w * n * b + a, b), rMul(x, N(n + 1)), N(w * n)], MIX); }
    const b = r.int(2, 9), a = r.int(1, b - 1), k = r.int(2, 9); if (gcd(a, b) !== 1) return null;
    return mk(u, 'of', [b * k, a, b], `${b * k}의 ${a}/${J(b, '는', a)} □입니다.`, `${b * k} × ${a}/${b}`, N(k * a), [N(k), N(b * k * a), N(k * a + 1)]);
  });

  U(523, '5-2', '합동, 선대칭·점대칭', 5, [], '합동인 도형은 대응변·대응각이 같고, 대칭축은 대응점을 이은 선분을 수직이등분합니다.', (r, v) => {
    const u = 523;
    if (v === 0) { const a = r.int(4, 16) * 5, b = r.int(4, 16) * 5; if (a + b >= 170) return null; return mk(u, 'corr', [a, b], `서로 합동인 삼각형 ㄱㄴㄷ과 ㄹㅁㅂ에서 각 ㄱ이 ${a}°, 각 ㄴ이 ${b}°이면 각 ㅂ은 □입니다.`, '각 ㅂ의 대응각은 각 ㄷ입니다.', N(180 - a - b), [N(a), N(b), N(360 - a - b)], unitL('°')); }
    if (v === 1) { const d = r.int(2, 12) * 2; return mk(u, 'center', [d], `점대칭도형에서 두 대응점을 이은 선분의 길이가 ${d} cm이면 한 점에서 대칭의 중심까지는 □입니다.`, '대칭의 중심은 대응점을 이은 선분을 둘로 똑같이 나눕니다.', N(d / 2), [N(d), N(d * 2), N(d / 2 + 1)], unitL('cm')); }
    if (v === 2) { const n = r.int(3, 10), NAME = { 3: '정삼', 4: '정사', 5: '정오', 6: '정육', 7: '정칠', 8: '정팔', 9: '정구', 10: '정십' }; return mk(u, 'axes', [n], `${NAME[n]}각형의 대칭축은 모두 □개입니다.`, '정다각형의 대칭축 수는 변의 수와 같습니다.', N(n), [N(n - 1), N(n * 2), N(n + 1)], unitL('개')); }
    if (v === 3) { const b = r.int(9, 17) * 5; return mk(u, 'iso', [b], `선대칭도형인 이등변삼각형의 한 밑각이 ${b}°이면 나머지 한 각은 □입니다.`, '두 밑각은 같고, 세 각의 합은 180°입니다.', N(180 - 2 * b), [N(b), N(180 - b), N(90 - b)], unitL('°')); }
    const p = r.int(12, 40); return mk(u, 'perim', [p], `둘레가 ${p} cm인 사각형과 서로 합동인 사각형의 둘레는 □입니다.`, '합동인 도형은 대응변의 길이가 같습니다.', N(p), [N(p * 2), R(p, 2), N(p + 4)], unitL('cm'));
  });

  U(524, '5-2', '소수 × 자연수, 소수 × 소수', 5, [0, 1, 2, 3, 4], '자연수처럼 곱한 뒤 소수점 아래 자리 수만큼 소수점을 찍습니다.', (r, v) => {
    const u = 524;
    if (v === 0) { const a = r.int(11, 99), n = r.int(2, 9); if (a % 10 === 0) return null; return mk(u, 'dn', [a, n], `${decStr(D(a, 1))} × ${n} = □`, '소수점 아래 한 자리', D(a * n, 1), [D(a * n, 2), N(a * n), D(a * n + 10, 1)], DEC); }
    if (v === 1) { const a = r.int(2, 9), b = r.int(2, 9); return mk(u, 'dd', [a, b], `0.${a} × 0.${b} = □`, '소수점 아래 자리 수: 1 + 1 = 2', D(a * b, 2), [D(a * b, 1), D(a * b, 3), D(a + b, 1)], DEC); }
    if (v === 2) { const a = r.int(11, 49), b = r.int(11, 39); if (a % 10 === 0 || b % 10 === 0) return null; return mk(u, 'dd2', [a, b], `${decStr(D(a, 1))} × ${decStr(D(b, 1))} = □`, '소수점 아래 자리 수: 1 + 1 = 2', D(a * b, 2), [D(a * b, 1), D(a * b, 3), D(a * b + 100, 2)], DEC); }
    if (v === 3) { const n = r.int(3, 40), a = r.int(11, 99); if (a % 10 === 0) return null; return mk(u, 'nd2', [n, a], `${n} × ${decStr(D(a, 2))} = □`, '소수점 아래 두 자리', D(n * a, 2), [D(n * a, 1), D(n * a, 3), N(n * a)], DEC); }
    const a = r.int(101, 999), k = r.pick([10, 100, 1000]); if (a % 10 === 0) return null;
    return mk(u, 'shift', [a, k], `${decStr(D(a, 2))} × ${k} = □`, `곱하는 수의 0의 개수만큼 소수점을 오른쪽으로 옮깁니다.`, rMul(D(a, 2), N(k)), [rMul(D(a, 2), N(k / 10)), rMul(D(a, 2), N(k * 10)), D(a, 1)], DEC);
  });

  U(525, '5-2', '직육면체와 정육면체의 구성 요소', 5, [], '직육면체: 면 6개, 모서리 12개, 꼭짓점 8개', (r, v) => {
    const u = 525;
    if (v === 0) { const f = r.pick([['면', 6], ['모서리', 12], ['꼭짓점', 8]]); return mk(u, 'parts', [f[0]], `직육면체의 ${J(f[0], '은')} 모두 □개입니다.`, '면 6, 모서리 12, 꼭짓점 8', N(f[1]), [N(6), N(12), N(8), N(4)].filter(x => x.n !== f[1]), unitL('개')); }
    if (v === 1) { const a = r.int(3, 12), b = r.int(2, 10), c = r.int(2, 9); if (a === b || b === c || a === c) return null; return mk(u, 'edges', [a, b, c], `가로 ${a} cm, 세로 ${b} cm, 높이 ${c} cm인 직육면체의 모든 모서리 길이의 합은 □입니다.`, '같은 길이의 모서리가 4개씩 있습니다.', N(4 * (a + b + c)), [N(a + b + c), N(2 * (a + b + c)), N(a * b * c)], unitL('cm')); }
    if (v === 2) { const s = r.int(2, 15); return mk(u, 'cubeEdges', [s], `한 모서리가 ${s} cm인 정육면체의 모든 모서리 길이의 합은 □입니다.`, '정육면체는 모서리 12개의 길이가 모두 같습니다.', N(12 * s), [N(6 * s), N(8 * s), N(s * s * s === 12 * s ? 4 * s : s * s * s)], unitL('cm')); }
    if (v === 3) { const s = r.int(2, 15); return mk(u, 'cubeSide', [s], `모든 모서리 길이의 합이 ${12 * s} cm인 정육면체의 한 모서리는 □입니다.`, '모서리 길이의 합 ÷ 12', N(s), [N(2 * s), N(12 * s / 6), N(12 * s / 8 === Math.floor(12 * s / 8) && 12 * s / 8 !== s ? 12 * s / 8 : s + 3)], unitL('cm')); }
    const f = r.pick([['직육면체에서 한 면과 수직인 면', 4], ['직육면체에서 한 꼭짓점에서 만나는 면', 3], ['직육면체의 겨냥도에서 보이지 않는 모서리', 3], ['직육면체의 겨냥도에서 보이는 꼭짓점', 7], ['직육면체에서 한 면과 평행한 면', 1]]);
    return mk(u, 'fact', [f[0]], `${J(f[0], '은')} □개입니다.`, '직육면체 모형을 떠올려 보세요.', N(f[1]), [N(2), N(5), N(6), N(4), N(3), N(1)].filter(x => x.n !== f[1]), unitL('개'));
  });

  U(526, '5-2', '평균과 일이 일어날 가능성', 5, [], '평균 = 자료 값의 합 ÷ 자료의 수', (r, v) => {
    const u = 526;
    if (v === 0) { const n = r.pick([3, 4, 5]), m = r.int(10, 40); const xs = Array.from({ length: n - 1 }, () => m + r.int(-8, 8)); const last = m * n - xs.reduce((a, b) => a + b, 0); if (last <= 0) return null; xs.push(last); return mk(u, 'mean', xs, `${xs.join(', ')}의 평균은 □입니다.`, '모두 더한 뒤 자료의 수로 나눕니다.', N(m), [N(m + 1), N(m * n), N(Math.max(...xs))]); }
    if (v === 1) { const m = r.int(12, 45), n = r.int(3, 6); return mk(u, 'total', [m, n], `${n}명의 평균 점수가 ${m}점이면 점수의 합은 □점입니다.`, '평균 × 자료의 수', N(m * n), [N(m + n), N(m * (n - 1)), N(m * n + n)], unitL('점')); }
    if (v === 2) { const m = r.int(80, 90), a = r.int(75, 95), b = r.int(75, 95), c = r.int(75, 95); const need = 4 * m - a - b - c; if (need < 60 || need > 100) return null; return mk(u, 'need', [m, a, b, c], `수학 점수가 ${a}점, ${b}점, ${c}점입니다. 네 번의 평균이 ${m}점이 되려면 마지막에 □점`, '(평균 × 4) − 세 번 점수의 합', N(need), [N(m), N(need + 4), N(3 * m - a - b - c > 0 ? 3 * m - a - b - c : need - 4)], unitL('점')); }
    if (v === 3) { const c = r.pick(['흰', '노란', '빨간']), k = r.int(3, 9); return mk(u, 'sure', [c, k], `${c} 공만 ${k}개 들어 있는 주머니에서 ${c} 공을 꺼낼 가능성을 수로 나타내면 □입니다.`, '반드시 일어나는 일의 가능성은 1입니다.', N(1), [R(1, 2), R(1, k)]); }
    const k = r.int(2, 8); return mk(u, 'half', [k], `빨간 공 ${k}개와 파란 공 ${k}개가 든 주머니에서 빨간 공을 꺼낼 가능성을 수로 나타내면 □입니다.`, '반반이면 1/2입니다.', R(1, 2), [N(1), R(1, k), R(1, 4)]);
  });

  // =========================================================== 6학년 1학기
  U(611, '6-1', '(분수) ÷ (자연수)', 5, [0, 1, 2], '(분수) ÷ (자연수) = (분수) × 1/(자연수)', (r, v) => {
    const u = 611;
    if (v === 0) { const a = r.int(1, 15), b = r.int(2, 9); if (a % b === 0) return null; return mk(u, 'nn', [a, b], `${a} ÷ ${b} = □`, `${a} ÷ ${J(b, '는')} ${a}/${J(b, '로', a)} 나타낼 수 있습니다.`, R(a, b), [R(b, a), N(Math.floor(a / b) || 1), R(a, b * b)], MIX); }
    if (v === 1) { const b = r.int(3, 9), a = r.int(1, b - 1), n = r.int(2, 6); if (gcd(a, b) !== 1) return null; return mk(u, 'fn', [a, b, n], `${a}/${b} ÷ ${n} = □`, `${a}/${b} × 1/${n}로 계산합니다.`, R(a, b * n), [R(a * n, b), R(a, b + n), R(n, a * b)]); }
    if (v === 2) { const b = r.int(2, 6), w = r.int(1, 4), a = r.int(1, b - 1), n = r.int(2, 5); if (gcd(a, b) !== 1) return null; const x = R(w * b + a, b); return mk(u, 'mixn', [w, a, b, n], `${mixedTxt(w, a, b)} ÷ ${n} = □`, '대분수를 가분수로 바꾼 뒤 나눕니다.', rDiv(x, N(n)), [rMul(x, N(n)), R(w, n), R(w * b + a, b + n)], MIX); }
    const n = r.int(3, 8), a = r.int(1, 2 * n); if (a % n === 0) return null;
    return mk(u, 'word', [a, n], `주스 ${a} L를 ${n}명이 똑같이 나누어 마시면 한 명은 □ L를 마십니다.`, '전체 ÷ 사람 수', R(a, n), [R(n, a), R(a, n * n), N(a + n)], Object.assign(unitL('L'), MIX));
  });

  U(612, '6-1', '각기둥과 각뿔의 구성 요소', 6, [], 'n각기둥: 면 n+2, 모서리 n×3, 꼭짓점 n×2 / n각뿔: 면 n+1, 모서리 n×2, 꼭짓점 n+1', (r, v) => {
    const u = 612, n = r.int(3, 10);
    const NAME = { 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십' };
    const prism = [['면', n + 2], ['모서리', 3 * n], ['꼭짓점', 2 * n]], pyr = [['면', n + 1], ['모서리', 2 * n], ['꼭짓점', n + 1]];
    if (v <= 2) { const [k, val] = prism[v]; return mk(u, 'prism' + v, [n], `${NAME[n]}각기둥의 ${J(k, '은')} 모두 □개입니다.`, '밑면이 2개인 기둥 모양입니다.', N(val), prism.concat(pyr).map(x => N(x[1])).filter(x => x.n !== val), unitL('개')); }
    if (v <= 4) { const [k, val] = pyr[v - 3]; return mk(u, 'pyr' + (v - 3), [n], `${NAME[n]}각뿔의 ${J(k, '은')} 모두 □개입니다.`, '밑면이 1개이고 옆면이 한 점에서 만납니다.', N(val), prism.concat(pyr).map(x => N(x[1])).filter(x => x.n !== val), unitL('개')); }
    return mk(u, 'which', [n], `모서리가 ${3 * n}개인 각기둥은 밑면의 변이 □개인 각기둥입니다.`, '각기둥의 모서리 수 = 밑면의 변의 수 × 3', N(n), [N(3 * n / 2 === Math.floor(3 * n / 2) ? 3 * n / 2 : n + 2), N(n + 1), N(n - 1)], unitL('개'));
  });

  U(613, '6-1', '(소수) ÷ (자연수)', 4, [0, 1, 2], '자연수의 나눗셈처럼 계산하고 소수점을 그대로 올려 찍습니다.', (r, v) => {
    const u = 613;
    if (v === 0) { const n = r.int(2, 9), q = r.int(11, 99); if (q % 10 === 0) return null; return mk(u, 'dn', [n * q, n], `${decStr(D(n * q, 1))} ÷ ${n} = □`, '몫의 소수점은 나누어지는 수의 소수점 위치에 찍습니다.', D(q, 1), [N(q), D(q, 2), D(q + 1, 1)], DEC); }
    if (v === 1) { const n = r.pick([2, 4, 5, 8]), a = r.int(1, 30); if (a % n === 0) return null; const ans = R(a, n); return mk(u, 'nn', [a, n], `${a} ÷ ${n} = □ (소수로)`, '나누어떨어지지 않으면 0을 내려 계속 나눕니다.', ans, [R(ans.n * 10, ans.d), R(ans.n, ans.d * 10), rAdd(ans, N(1))], DEC); }
    if (v === 2) { const n = r.int(2, 9), q = r.int(2, 9); return mk(u, 'small', [n * q, n], `0.${String(n * q).padStart(2, '0')} ÷ ${n} = □`, '몫의 일의 자리에 0을 씁니다.', D(q, 2), [D(q, 1), D(q, 3), N(q)], DEC); }
    const n = r.int(3, 8), q = r.int(11, 49); if (q % 10 === 0) return null;
    return mk(u, 'word', [n * q, n], `끈 ${decStr(D(n * q, 1))} m를 ${n}도막으로 똑같이 자르면 한 도막은 □ m입니다.`, '전체 ÷ 도막 수', D(q, 1), [N(q), D(q, 2), D(q + 2, 1)], Object.assign(unitL('m'), DEC));
  });

  U(614, '6-1', '비, 비율, 백분율', 6, [], '비율 = 비교하는 양 ÷ 기준량, 백분율 = 비율 × 100', (r, v) => {
    const u = 614;
    if (v === 0) { const a = r.int(1, 9), b = r.int(2, 12); if (a === b || gcd(a, b) !== 1) return null; return mk(u, 'frac', [a, b], `비 ${a} : ${b}의 비율을 분수로 나타내면 □입니다.`, '비교하는 양 ÷ 기준량', R(a, b), [R(b, a), R(a, a + b), R(a + 1, b)]); }
    if (v === 1) { const p = r.int(2, 98); if (p % 10 === 0) return null; return mk(u, 'topct', [p], `비율 0.${J(String(p).padStart(2, '0'), '을')} 백분율로 나타내면 □입니다.`, '비율 × 100', N(p), [D(p, 1), N(p * 10), D(p, 2)], unitL('%', DEC)); }
    if (v === 2) { const p = r.int(3, 97); if (p % 10 === 0) return null; return mk(u, 'todec', [p], `${p}%를 소수로 나타내면 □입니다.`, '백분율 ÷ 100', D(p, 2), [D(p, 1), N(p), D(p, 3)], DEC); }
    if (v === 3) { const n = r.pick([20, 25, 40, 50]), k = r.int(1, n - 1); const pct = k * 100 / n; if (!Number.isInteger(pct)) return null; return mk(u, 'rate', [n, k], `${n}명 중 ${k}명이 찬성했습니다. 찬성률은 □입니다.`, '(찬성한 수 ÷ 전체) × 100', N(pct), [N(k), N(100 - pct), N(n - k)], unitL('%')); }
    if (v === 4) { const b = r.pick([20, 40, 50, 80, 200]), pct = r.pick([10, 20, 25, 30, 40, 50, 75]); const x = b * pct / 100; if (!Number.isInteger(x)) return null; return mk(u, 'part', [b, pct], `${b}의 ${pct}%는 □입니다.`, `${b} × ${pct}/100`, N(x), [N(b - x), N(pct), N(x * 10)]); }
    const a = r.int(2, 9), b = r.int(2, 9); if (a === b) return null;
    return mk(u, 'base', [a, b], `비 ${a} : ${b}에서 기준량은 □입니다.`, '기호 : 의 오른쪽에 있는 수가 기준량입니다.', N(b), [N(a), N(a + b), N(a * b)]);
  });

  U(615, '6-1', '띠그래프와 원그래프', 5, [], '띠그래프와 원그래프는 전체를 100%로 봅니다.', (r, v) => {
    const u = 615;
    if (v === 0) { const n = r.pick([20, 40, 50, 80, 200]), pct = r.pick([10, 15, 20, 25, 30, 35, 40, 45]); const x = n * pct / 100; if (!Number.isInteger(x)) return null; return mk(u, 'count', [n, pct], `전체 ${n}명을 나타낸 띠그래프에서 ${pct}%인 항목은 □명입니다.`, '전체 × 백분율 ÷ 100', N(x), [N(pct), N(n - x), N(x * 2)], unitL('명')); }
    if (v === 1) { const n = r.pick([20, 25, 40, 50]), k = r.int(2, n - 2); const pct = k * 100 / n; if (!Number.isInteger(pct)) return null; return mk(u, 'pct', [n, k], `전체 ${n}명 중 ${k}명인 항목은 원그래프에서 □를 차지합니다.`, '(항목 ÷ 전체) × 100', N(pct), [N(k), N(100 - pct), N(pct + 10)], unitL('%')); }
    if (v === 2) { const pct = r.int(1, 18) * 5; return mk(u, 'deg', [pct], `원그래프에서 ${pct}%인 항목의 중심각은 □입니다.`, '360° × 백분율 ÷ 100', N(pct * 360 / 100), [N(pct), N(pct * 180 / 100 === Math.floor(pct * 180 / 100) ? pct * 180 / 100 : pct + 90), N(360 - pct * 360 / 100)], unitL('°')); }
    if (v === 3) { const a = r.int(1, 6), b = r.int(1, 9); return mk(u, 'pict', [a, b], `그림그래프에서 큰 그림은 10만 명, 작은 그림은 1만 명입니다. 큰 그림 ${a}개, 작은 그림 ${b}개는 □입니다.`, '큰 그림 수 × 10만 + 작은 그림 수 × 1만', N(10 * a + b), [N(a + b), N(10 * b + a), N(10 * (a + b))], unitL('만 명')); }
    const pct = r.int(1, 19) * 5; return mk(u, 'band', [pct], `길이가 20 cm인 띠그래프에서 ${pct}%인 항목의 길이는 □입니다.`, '20 × 백분율 ÷ 100', R(20 * pct, 100), [N(pct), R(pct, 10), R(20 * pct, 100 * 2)], Object.assign(unitL('cm'), DEC));
  });

  U(616, '6-1', '직육면체의 부피와 겉넓이 구하기', 6, [], '부피 = 가로 × 세로 × 높이, 겉넓이 = (세 면의 넓이의 합) × 2', (r, v) => {
    const u = 616;
    if (v === 0) { const a = r.int(2, 12), b = r.int(2, 10), c = r.int(2, 9); if (a === b || b === c || a === c) return null; return mk(u, 'vol', [a, b, c], `가로 ${a} cm, 세로 ${b} cm, 높이 ${c} cm인 직육면체의 부피는 □입니다.`, '가로 × 세로 × 높이', N(a * b * c), [N(2 * (a * b + b * c + c * a)), N(a + b + c), N(a * b)], unitL('cm³')); }
    if (v === 1) { const s = r.int(2, 12); return mk(u, 'cubeVol', [s], `한 모서리가 ${s} cm인 정육면체의 부피는 □입니다.`, '한 모서리 × 한 모서리 × 한 모서리', N(s ** 3), [N(6 * s * s), N(s * s), N(12 * s)], unitL('cm³')); }
    if (v === 2) { const a = r.int(2, 10), b = r.int(2, 9), c = r.int(2, 8); if (a === b || b === c || a === c) return null; return mk(u, 'area', [a, b, c], `가로 ${a} cm, 세로 ${b} cm, 높이 ${c} cm인 직육면체의 겉넓이는 □입니다.`, '(가로×세로 + 세로×높이 + 높이×가로) × 2', N(2 * (a * b + b * c + c * a)), [N(a * b * c), N(a * b + b * c + c * a), N(6 * a * b)], unitL('cm²')); }
    if (v === 3) { const s = r.int(2, 12); return mk(u, 'cubeArea', [s], `한 모서리가 ${s} cm인 정육면체의 겉넓이는 □입니다.`, '한 면의 넓이 × 6', N(6 * s * s), [N(s ** 3), N(4 * s * s), N(s * s)], unitL('cm²')); }
    if (v === 4) { const k = r.int(2, 9); return mk(u, 'm3', [k], `${k} m³는 □ cm³입니다.`, '1 m³ = 1000000 cm³', N(k * 1000000), [N(k * 1000), N(k * 100), N(k * 10000)]); }
    const a = r.int(2, 9), b = r.int(2, 9), h = r.int(2, 9); if (a === b) return null;
    return mk(u, 'height', [a, b, h], `부피가 ${a * b * h} cm³, 가로 ${a} cm, 세로 ${b} cm인 직육면체의 높이는 □입니다.`, '부피 ÷ (가로 × 세로)', N(h), [N(a * b), N(a * b * h / a), N(h + 1)], unitL('cm'));
  });

  // =========================================================== 그림 (SVG) — 문제 글만으로도 풀 수 있고, 그림은 이해를 돕는다
  const C_LINE = '#38bdf8', C_ACC = '#fbbf24', C_TXT = '#e2e8f0', C_DIM = '#94a3b8', C_FILL = '#1e293b', C_Q = '#f472b6';
  const svgWrap = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" class="w-full max-w-[310px] h-auto" font-family="sans-serif">${body}</svg>`;
  const tx = (x, y, s, fill, fs, anchor, wt) => `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" fill="${fill || C_TXT}" font-size="${fs || 12}" font-weight="${wt || 'bold'}" text-anchor="${anchor || 'middle'}">${s}</text>`;
  const ln = (x1, y1, x2, y2, st, sw, dash) => `<line x1="${(+x1).toFixed(1)}" y1="${(+y1).toFixed(1)}" x2="${(+x2).toFixed(1)}" y2="${(+y2).toFixed(1)}" stroke="${st || C_LINE}" stroke-width="${sw || 2}"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
  const pg = (pts, st, fill, sw, dash) => `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill || C_FILL}" stroke="${st || C_LINE}" stroke-width="${sw || 2.5}" stroke-linejoin="round"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // 꼭짓점 p의 안쪽(무게중심 쪽)으로 d만큼 들어간 자리 (각도 글자 위치)
  const inward = (p, cen, d) => { const vx = cen[0] - p[0], vy = cen[1] - p[1], l = Math.hypot(vx, vy) || 1; return [p[0] + vx / l * d, p[1] + vy / l * d + 4]; };
  // 변 a-b의 바깥쪽에 글자 (cen 반대쪽)
  const outside = (a, b, cen, d) => { const m = mid(a, b), vx = m[0] - cen[0], vy = m[1] - cen[1], l = Math.hypot(vx, vy) || 1; return [m[0] + vx / l * d, m[1] + vy / l * d + 4]; };
  const DG = {};

  // 막대그래프: bars [{name, v(값, null이면 '?' 자리), label}], k(눈금 한 칸), unit
  DG.g_bar = sp => {
    const vals = sp.bars.map(b => b.v || 0), maxV = Math.max(...vals, sp.k), cells = Math.ceil(maxV / sp.k) + 1;
    const x0 = 46, x1 = 290, y0 = 118, y1 = 20, ch = (y0 - y1) / cells;
    let b = tx(14, 12, '(' + sp.unit + ')', C_DIM, 10, 'start', 'normal');
    for (let i = 0; i <= cells; i++) {
      const y = y0 - i * ch;
      b += ln(x0, y, x1, y, i ? '#334155' : C_DIM, i ? 1 : 2);
      if (cells <= 12 || i % 2 === 0) b += tx(x0 - 6, y + 4, i * sp.k, C_DIM, 10, 'end', 'normal');
    }
    const n = sp.bars.length, slot = (x1 - x0) / n, bw = Math.min(34, slot * 0.55);
    sp.bars.forEach((br, i) => {
      const cx = x0 + slot * (i + 0.5);
      if (br.v === null) b += `<rect x="${cx - bw / 2}" y="${y0 - 2 * ch}" width="${bw}" height="${2 * ch}" fill="none" stroke="${C_Q}" stroke-dasharray="4 3" stroke-width="2"/>` + tx(cx, y0 - ch + 4, '?', C_Q, 14);
      else { const h = br.v / sp.k * ch; b += `<rect x="${cx - bw / 2}" y="${(y0 - h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${br.hi ? C_ACC : C_LINE}" opacity="0.85"/>`; if (br.label) b += tx(cx, y0 - h - 5, br.label, br.label === '?' ? C_Q : C_ACC, 12); }
      b += tx(cx, y0 + 15, br.name, C_TXT, 11);
    });
    return svgWrap(300, 140, b);
  };

  // 꺾은선그래프: xs 이름, ys 값(null이면 그 자리 '?'), base(아래 끝 값), step(한 칸), unit, labels(점 위 글자)
  DG.g_line = sp => {
    const rows = Math.round((Math.max(...sp.ys.filter(v => v !== null)) - sp.base) / sp.step) + 1;
    const x0 = 52, x1 = 290, y0 = 116, y1 = 18, ch = (y0 - y1) / rows, n = sp.xs.length, slot = (x1 - x0) / n;
    const Y = v => y0 - (v - sp.base) / sp.step * ch;
    let b = tx(14, 12, '(' + sp.unit + ')', C_DIM, 10, 'start', 'normal');
    for (let i = 0; i <= rows; i++) { const y = y0 - i * ch; b += ln(x0, y, x1, y, i ? '#334155' : C_DIM, i ? 1 : 2); if (rows <= 12 || i % 2 === 0) b += tx(x0 - 6, y + 4, B2(sp.base + i * sp.step), C_DIM, 10, 'end', 'normal'); }
    if (sp.base > 0) b += `<path d="M${x0 - 4},${y0 - 3} l4,-3 l4,3 l4,-3" stroke="${C_DIM}" fill="none"/>`;   // 물결선(아래 생략)
    const pts = sp.xs.map((_, i) => [x0 + slot * (i + 0.5), sp.ys[i] === null ? null : Y(sp.ys[i])]);
    for (let i = 1; i < n; i++) if (pts[i - 1][1] !== null && pts[i][1] !== null) b += ln(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], C_ACC, 2.5);
    pts.forEach((p, i) => {
      b += tx(p[0], y0 + 15, sp.xs[i], C_TXT, 11);
      if (p[1] === null) b += tx(p[0], y0 - ch * rows / 2, '?', C_Q, 16);
      else { b += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${C_ACC}"/>`; if (sp.labels && sp.labels[i]) b += tx(p[0], p[1] - 8, sp.labels[i], C_ACC, 11); }
    });
    return svgWrap(300, 138, b);
  };
  const B2 = v => String(Math.round(v * 100) / 100);

  // 띠그래프: segs [{name, pct, txt}], total(띠 아래 글자)
  const SEG_COL = ['#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#fb7185', '#94a3b8'];
  DG.g_band = sp => {
    const x0 = 15, x1 = 285, y = 40, h = 40; let x = x0, b = '';
    sp.segs.forEach((sg, i) => { const w = (x1 - x0) * sg.pct / 100; b += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" fill="${SEG_COL[i % 6]}" opacity="${sg.hi ? 1 : 0.55}" stroke="#0f172a"/>`; b += tx(x + w / 2, y - 8, sg.name, C_TXT, 11); if (sg.txt) b += tx(x + w / 2, y + h / 2 + 5, sg.txt, '#0f172a', 12); x += w; });
    b += tx(150, 104, sp.total || '', C_DIM, 11, 'middle', 'normal');
    return svgWrap(300, 115, b);
  };
  // 원그래프: segs [{name, pct, txt}]
  DG.g_pie = sp => {
    const cx = 95, cy = 70, r = 58; let a0 = -Math.PI / 2, b = '', leg = '';
    sp.segs.forEach((sg, i) => {
      const a1 = a0 + sg.pct / 100 * Math.PI * 2, large = sg.pct > 50 ? 1 : 0;
      b += `<path d="M${cx},${cy} L${(cx + r * Math.cos(a0)).toFixed(1)},${(cy + r * Math.sin(a0)).toFixed(1)} A${r},${r} 0 ${large} 1 ${(cx + r * Math.cos(a1)).toFixed(1)},${(cy + r * Math.sin(a1)).toFixed(1)} Z" fill="${SEG_COL[i % 6]}" opacity="${sg.hi ? 1 : 0.55}" stroke="#0f172a"/>`;
      const am = (a0 + a1) / 2; if (sg.txt) b += tx(cx + r * 0.6 * Math.cos(am), cy + r * 0.6 * Math.sin(am) + 4, sg.txt, '#0f172a', 11);
      leg += `<rect x="178" y="${22 + i * 20}" width="12" height="12" fill="${SEG_COL[i % 6]}" opacity="${sg.hi ? 1 : 0.55}"/>` + tx(196, 32 + i * 20, sg.name, C_TXT, 11, 'start');
      a0 = a1;
    });
    return svgWrap(300, 140, b + leg);
  };
  // 그림그래프: 큰 그림 a개, 작은 그림 b개
  DG.g_pict = sp => {
    let b = `<circle cx="22" cy="20" r="9" fill="${C_ACC}"/>` + tx(36, 24, '= 10만 명', C_TXT, 11, 'start') + `<circle cx="130" cy="20" r="5" fill="${C_LINE}"/>` + tx(140, 24, '= 1만 명', C_TXT, 11, 'start');
    let x = 22;
    for (let i = 0; i < sp.a; i++) { b += `<circle cx="${x}" cy="62" r="11" fill="${C_ACC}"/>`; x += 26; }
    for (let i = 0; i < sp.b; i++) { b += `<circle cx="${x}" cy="66" r="6" fill="${C_LINE}"/>`; x += 15; }
    b += tx(150, 98, '어느 도시의 인구', C_DIM, 11, 'middle', 'normal');
    return svgWrap(300, 108, b);
  };

  // 시계: h시 정각, 두 바늘 사이 각에 '?'
  DG.g_clock = sp => {
    const cx = 150, cy = 70, r = 56; let b = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C_FILL}" stroke="${C_LINE}" stroke-width="3"/>`;
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; b += tx(cx + (r - 13) * Math.cos(a), cy + (r - 13) * Math.sin(a) + 4, i, C_TXT, 11); }
    const ah = sp.h / 12 * Math.PI * 2 - Math.PI / 2;
    b += ln(cx, cy, cx, cy - r + 8, C_TXT, 2.5) + ln(cx, cy, cx + (r - 22) * Math.cos(ah), cy + (r - 22) * Math.sin(ah), C_ACC, 4);
    const am = (-Math.PI / 2 + ah) / 2;
    b += `<path d="M${cx},${cy - 18} A18,18 0 0 1 ${(cx + 18 * Math.cos(ah)).toFixed(1)},${(cy + 18 * Math.sin(ah)).toFixed(1)}" fill="none" stroke="${C_Q}" stroke-width="2"/>`;
    b += tx(cx + 30 * Math.cos(am), cy + 30 * Math.sin(am) + 4, '?', C_Q, 13) + `<circle cx="${cx}" cy="${cy}" r="3" fill="${C_TXT}"/>`;
    return svgWrap(300, 140, b);
  };

  // 삼각형: 밑각 A(왼쪽), B(오른쪽) 크기로 그림, 각·변 글자 (angles: [왼쪽, 오른쪽, 위], sides: [밑변, 왼쪽 변, 오른쪽 변])
  function triPts(A, Bg) {
    const a = A * Math.PI / 180, bb = Bg * Math.PI / 180, base = 200;
    const px = base * Math.tan(bb) / (Math.tan(a) + Math.tan(bb)), py = px * Math.tan(a);
    const s = Math.min(1, 100 / py), w = base * s;
    const L0 = [150 - w / 2, 120], R0 = [150 + w / 2, 120], T0 = [150 - w / 2 + px * s, 120 - py * s];
    return [L0, R0, T0];
  }
  DG.g_tri = sp => {
    const [P, Q, T] = triPts(sp.A, sp.B), cen = [(P[0] + Q[0] + T[0]) / 3, (P[1] + Q[1] + T[1]) / 3];
    let b = pg([P, Q, T]);
    const ang = sp.angles || [], sd = sp.sides || [];
    [[P, ang[0]], [Q, ang[1]], [T, ang[2]]].forEach(([v, s]) => { if (s) { const p = inward(v, cen, 24); b += tx(p[0], p[1], s, s.includes('?') ? C_Q : C_ACC, 12); } });
    [[P, Q, sd[0]], [P, T, sd[1]], [Q, T, sd[2]]].forEach(([u, v, s]) => { if (s) { const p = outside(u, v, cen, 14); b += tx(p[0], p[1], s, s.includes('?') ? C_Q : C_LINE, 12); } });
    if (sp.ticks) [[P, T], [Q, T]].concat(sp.ticks === 3 ? [[P, Q]] : []).forEach(([u, v]) => { const m = mid(u, v); b += `<circle cx="${m[0].toFixed(1)}" cy="${m[1].toFixed(1)}" r="2.5" fill="${C_ACC}"/>`; });
    if (sp.names) [[P, sp.names[0]], [Q, sp.names[1]], [T, sp.names[2]]].forEach(([v, s]) => { const p = inward(v, cen, -12); b += tx(p[0], p[1], s, C_DIM, 12); });
    return svgWrap(300, 140, b);
  };
  // 합동인 두 삼각형: 왼쪽 ㄱㄴㄷ, 오른쪽은 뒤집힌 ㄹㅁㅂ
  DG.g_cong = sp => {
    // 삼각형을 왼쪽 상자(가로 115, 세로 85)에 맞춰 크게 그린다
    const raw = triPts(sp.A, sp.B), xs = raw.map(p => p[0]), ys = raw.map(p => p[1]);
    const sc = Math.min(115 / (Math.max(...xs) - Math.min(...xs)), 85 / (Math.max(...ys) - Math.min(...ys)));
    const [P, Q, T] = raw.map(p => [25 + (p[0] - Math.min(...xs)) * sc, 110 - (Math.max(...ys) - p[1]) * sc]);
    const flip = p => [300 - p[0], p[1]];
    const P2 = flip(P), Q2 = flip(Q), T2 = flip(T);
    const c1 = [(P[0] + Q[0] + T[0]) / 3, (P[1] + Q[1] + T[1]) / 3], c2 = [300 - c1[0], c1[1]];
    let b = pg([P, Q, T]) + pg([P2, Q2, T2]);
    // 이름: 밑변 두 꼭짓점은 아래, 꼭대기는 위 / 각도: 꼭짓점 옆(바깥)
    [[P, 'ㄱ'], [Q, 'ㄴ'], [P2, 'ㄹ'], [Q2, 'ㅁ']].forEach(([v, sname]) => { b += tx(v[0], v[1] + 15, sname, C_DIM, 12); });
    [[T, 'ㄷ'], [T2, 'ㅂ']].forEach(([v, sname]) => { b += tx(v[0], v[1] - 6, sname, C_DIM, 12); });
    b += tx(P[0] - 4, P[1] - 4, sp.A + '°', C_ACC, 11, 'end') + tx(Q[0] + 4, Q[1] - 4, sp.B + '°', C_ACC, 11, 'start');
    b += tx(T2[0] + 8, T2[1] + 14, '?', C_Q, 14, 'start');
    return svgWrap(300, 125, b);
  };
  // 사각형: kind 'para' | 'rhombus' | 'quad', angles [왼아래, 오른아래, 오른위, 왼위], sides [아래, 왼쪽]
  DG.g_quad = sp => {
    let V;
    if (sp.kind2 === 'quad') V = [[55, 118], [235, 118], [262, 40], [100, 22]];
    else { const a = (sp.acute || 65) * Math.PI / 180, s = sp.kind2 === 'rhombus' ? 100 : 75, w = sp.kind2 === 'rhombus' ? 100 : 150, dx = s * Math.cos(a), dy = s * Math.sin(a), x0 = 150 - (w + dx) / 2; V = [[x0, 118], [x0 + w, 118], [x0 + w + dx, 118 - dy], [x0 + dx, 118 - dy]]; }
    const cen = [V.reduce((t, p) => t + p[0], 0) / 4, V.reduce((t, p) => t + p[1], 0) / 4];
    let b = pg(V);
    (sp.angles || []).forEach((s, i) => { if (s) { const p = inward(V[i], cen, 24); b += tx(p[0], p[1], s, s.includes('?') ? C_Q : C_ACC, 12); } });
    (sp.sides || []).forEach((s, i) => { if (s) { const [u, v] = i === 0 ? [V[0], V[1]] : [V[0], V[3]]; const p = outside(u, v, cen, 14); b += tx(p[0], p[1], s, s.includes('?') ? C_Q : C_LINE, 12); } });
    if (sp.kind2 === 'rhombus') [[V[0], V[1]], [V[1], V[2]], [V[2], V[3]], [V[3], V[0]]].forEach(([u, v]) => { const m = mid(u, v); b += `<circle cx="${m[0].toFixed(1)}" cy="${m[1].toFixed(1)}" r="2.5" fill="${C_ACC}"/>`; });
    return svgWrap(300, 135, b);
  };
  // 정다각형: n, side(글자), mark(한 꼭짓점 표시)
  DG.g_poly = sp => {
    const cx = 150, cy = 72, r = 56, V = Array.from({ length: sp.n }, (_, i) => { const a = -Math.PI / 2 + i / sp.n * Math.PI * 2 + (sp.n % 2 ? 0 : Math.PI / sp.n); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    let b = pg(V, C_LINE, C_FILL, 2.5, sp.dashed);
    if (sp.side) { const p = outside(V[0], V[1], [cx, cy], 14); b += tx(p[0], p[1], sp.side, C_LINE, 12); }
    if (sp.mark) b += `<circle cx="${V[0][0].toFixed(1)}" cy="${V[0][1].toFixed(1)}" r="5" fill="${C_Q}"/>`;
    return svgWrap(300, 140, b);
  };
  // 넓이 도형: kind rect|para|tri|trap|rhom|square, 글자 a,b,h,p,q
  DG.g_area = sp => {
    let b = '', V;
    const L = (x1, y1, x2, y2, s, ox, oy, col) => ln(x1, y1, x2, y2, col || C_ACC, 1.5, true) + tx((x1 + x2) / 2 + (ox || 0), (y1 + y2) / 2 + (oy || 0), s, col || C_ACC, 12);
    if (sp.shape === 'rect' || sp.shape === 'square') { V = [[70, 118], [230, 118], [230, 28], [70, 28]]; if (sp.shape === 'square') V = [[105, 118], [195, 118], [195, 28], [105, 28]]; b += pg(V); if (sp.a) b += tx(150, 134, sp.a, C_LINE, 12); if (sp.b) b += tx(V[1][0] + 8, 77, sp.b, C_LINE, 12, 'start'); if (sp.inner) b += tx(150, 78, sp.inner, C_ACC, 12); }
    else if (sp.shape === 'para') { V = [[55, 118], [205, 118], [245, 28], [95, 28]]; b += pg(V) + L(95, 28, 95, 118, sp.h, 18, 0) + tx(130, 134, sp.a, C_LINE, 12); }
    else if (sp.shape === 'tri') { V = [[60, 118], [240, 118], [170, 26]]; b += pg(V) + L(170, 26, 170, 118, sp.h, 18, 0) + tx(150, 134, sp.a, C_LINE, 12); }
    else if (sp.shape === 'trap') { V = [[50, 118], [250, 118], [195, 30], [105, 30]]; b += pg(V) + L(105, 30, 105, 118, sp.h, 18, 0) + tx(150, 134, sp.b, C_LINE, 12) + tx(150, 22, sp.a, C_LINE, 12); }
    else if (sp.shape === 'rhom') { V = [[150, 18], [230, 72], [150, 126], [70, 72]]; b += pg(V) + ln(150, 18, 150, 126, C_ACC, 1.5, true) + ln(70, 72, 230, 72, C_ACC, 1.5, true) + tx(162, 52, sp.p, C_ACC, 12, 'start') + tx(110, 66, sp.q, C_ACC, 12); }
    return svgWrap(300, 142, b);
  };
  // 직육면체 겨냥도: a(가로) b(세로, 깊이) c(높이) 글자, 보이지 않는 모서리는 점선
  DG.g_box = sp => {
    const W = sp.cube ? 100 : 130, H = sp.cube ? 100 : 80, Dx = sp.cube ? 45 : 50, Dy = sp.cube ? 32 : 30, x0 = 150 - (W + Dx) / 2, y0 = 128;
    const A = [x0, y0], Bp = [x0 + W, y0], Cp = [x0 + W, y0 - H], Dp = [x0, y0 - H];
    const E = [A[0] + Dx, A[1] - Dy], F = [Bp[0] + Dx, Bp[1] - Dy], G = [Cp[0] + Dx, Cp[1] - Dy], Hh = [Dp[0] + Dx, Dp[1] - Dy];
    let b = pg([A, Bp, Cp, Dp], C_LINE, C_FILL) + pg([Bp, F, G, Cp], C_LINE, '#162032') + pg([Dp, Cp, G, Hh], C_LINE, '#22304a');
    b += ln(A[0], A[1], E[0], E[1], C_DIM, 1.5, true) + ln(E[0], E[1], F[0], F[1], C_DIM, 1.5, true) + ln(E[0], E[1], Hh[0], Hh[1], C_DIM, 1.5, true);
    if (sp.a) b += tx((A[0] + Bp[0]) / 2, y0 + 14, sp.a, C_ACC, 12);
    if (sp.b) b += tx((Bp[0] + F[0]) / 2 + 14, (Bp[1] + F[1]) / 2 + 8, sp.b, C_ACC, 12, 'start');
    if (sp.c) b += tx(F[0] + 8, (F[1] + G[1]) / 2 + 4, sp.c, sp.c.includes('?') ? C_Q : C_ACC, 12, 'start');
    return svgWrap(300, 145, b);
  };
  // 각기둥(prism) / 각뿔(pyramid): 밑면 n각형
  DG.g_solid = sp => {
    const n = sp.n, cx = 150, rx = 70, ry = 20, yb = 120, top = sp.pyramid ? 18 : 40;
    // 살짝 돌려서 앞뒤 꼭짓점이 겹쳐 보이지 않게 (사각기둥이 납작한 직사각형처럼 보이던 문제)
    const base = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + 0.35; return [cx + rx * Math.cos(a), yb + ry * Math.sin(a), Math.sin(a)]; });
    const back = v => v[2] < -0.05;
    let b = '';
    const edge = (u, v, hidden) => ln(u[0], u[1], v[0], v[1], hidden ? C_DIM : C_LINE, hidden ? 1.5 : 2.5, hidden);
    for (let i = 0; i < n; i++) { const u = base[i], v = base[(i + 1) % n]; b += edge(u, v, back(u) && back(v)); }
    if (sp.pyramid) { const apex = [cx, top]; base.forEach(v => { b += edge(v, apex, back(v)); }); }
    else {
      const up = base.map(v => [v[0], v[1] - (yb - top - ry), v[2]]);
      for (let i = 0; i < n; i++) { const u = up[i], v = up[(i + 1) % n]; b += edge(u, v, false); b += edge(base[i], up[i], back(base[i])); }
    }
    return svgWrap(300, 145, b);
  };
  // 밀기: 칸 줄에서 a번째 칸의 도형을 오른쪽으로 c칸
  DG.g_slide = sp => {
    const n = Math.max(sp.a + sp.c + 1, 10), w = Math.min(26, 280 / n), x0 = 150 - n * w / 2, y = 52;
    let b = '';
    for (let i = 0; i < n; i++) b += `<rect x="${(x0 + i * w).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${w.toFixed(1)}" fill="none" stroke="#334155"/>`;
    const cx = x0 + (sp.a - 0.5) * w;
    b += pg([[cx, y + 4], [cx + w * 0.38, y + w - 4], [cx - w * 0.38, y + w - 4]], C_ACC, C_ACC, 1);
    b += tx(x0 + w * 0.5, y + w + 16, '1번째', C_DIM, 10, 'middle', 'normal');
    b += `<path d="M${cx},${y - 8} Q${cx + sp.c * w / 2},${y - 30} ${cx + sp.c * w},${y - 8}" fill="none" stroke="${C_Q}" stroke-width="2"/>` + tx(cx + sp.c * w / 2, y - 26, '오른쪽 ' + sp.c + '칸', C_Q, 11);
    return svgWrap(300, 100, b);
  };
  // 돌리기: 화살표 모양 도형 + 도는 방향
  DG.g_turn = sp => {
    let b = pg([[120, 70], [150, 40], [180, 70], [162, 70], [162, 100], [138, 100], [138, 70]], C_ACC, C_FILL, 2.5);
    const cw = sp.dir !== 'ccw';
    b += `<path d="M${cw ? 205 : 95},55 A55,55 0 0 ${cw ? 1 : 0} ${cw ? 205 : 95},95" fill="none" stroke="${C_Q}" stroke-width="2.5"/>`;
    b += pg(cw ? [[205, 95], [198, 86], [212, 86]] : [[95, 95], [88, 86], [102, 86]], C_Q, C_Q, 1);
    b += tx(cw ? 250 : 50, 80, sp.label, C_Q, 12);
    return svgWrap(300, 125, b);
  };
  // 수직선: from~to, 이상(●)/초과(○) 표시
  DG.g_numline = sp => {
    const lo = sp.a - 2, hi = sp.b + 2, n = hi - lo, x0 = 20, x1 = 280, X = v => x0 + (v - lo) / n * (x1 - x0), y = 60;
    let b = ln(x0, y, x1, y, C_DIM, 2);
    for (let v = lo; v <= hi; v++) { b += ln(X(v), y - 5, X(v), y + 5, C_DIM, 1.5); if (v === sp.a || v === sp.b || n <= 14) b += tx(X(v), y + 20, v, v === sp.a || v === sp.b ? C_TXT : C_DIM, n > 14 ? 9 : 10, 'middle', v === sp.a || v === sp.b ? 'bold' : 'normal'); }
    b += ln(X(sp.a), y, X(sp.b), y, C_ACC, 4);
    [[sp.a, sp.inc], [sp.b, sp.inc]].forEach(([v, inc]) => { b += `<circle cx="${X(v).toFixed(1)}" cy="${y}" r="6" fill="${inc ? C_ACC : '#0f172a'}" stroke="${C_ACC}" stroke-width="2.5"/>`; });
    return svgWrap(300, 95, b);
  };
  // 대응표: ○ / ☆ 표, 마지막 칸 '?'
  DG.g_table = sp => {
    const cols = sp.top.length + 1, w = Math.min(52, 280 / cols), x0 = 150 - cols * w / 2;
    let b = '';
    [['○', sp.top], ['☆', sp.bottom]].forEach(([h, row], r) => {
      const y = 30 + r * 34;
      b += `<rect x="${x0}" y="${y}" width="${w}" height="34" fill="#334155" stroke="${C_DIM}"/>` + tx(x0 + w / 2, y + 22, h, C_ACC, 15);
      row.forEach((v, i) => { b += `<rect x="${(x0 + (i + 1) * w).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="34" fill="${C_FILL}" stroke="${C_DIM}"/>` + tx(x0 + (i + 1.5) * w, y + 22, v, v === '?' ? C_Q : C_TXT, 13); });
    });
    return svgWrap(300, 110, b);
  };
  // 바둑돌 정사각형 배열
  DG.g_dots = sp => {
    const n = sp.n, gap = Math.min(16, 110 / n), x0 = 150 - (n - 1) * gap / 2, y0 = 70 - (n - 1) * gap / 2;
    let b = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) b += `<circle cx="${(x0 + c * gap).toFixed(1)}" cy="${(y0 + r * gap).toFixed(1)}" r="${(gap * 0.38).toFixed(1)}" fill="${(r + c) % 2 ? '#f8fafc' : '#0f172a'}" stroke="${C_DIM}"/>`;
    b += tx(x0 + (n - 1) * gap / 2, y0 - gap, '한 변에 ' + n + '개', C_ACC, 11);
    return svgWrap(300, 140, b);
  };
  // 주머니 속 공: balls [{color, count}]
  DG.g_bag = sp => {
    let b = `<path d="M90,40 Q80,128 150,128 Q220,128 210,40 Z" fill="${C_FILL}" stroke="${C_DIM}" stroke-width="2.5"/>` + ln(100, 40, 200, 40, C_DIM, 3);
    let i = 0; const total = sp.balls.reduce((t, x) => t + x.count, 0), per = Math.min(6, Math.ceil(Math.sqrt(total * 1.6)));
    sp.balls.forEach(bl => { for (let k = 0; k < bl.count; k++, i++) { const r = Math.floor(i / per), c = i % per; b += `<circle cx="${(150 - (per - 1) * 9 + c * 18).toFixed(1)}" cy="${(112 - r * 17).toFixed(1)}" r="7.5" fill="${bl.color}" stroke="#0f172a"/>`; } });
    return svgWrap(300, 140, b);
  };
  Object.keys(DG).forEach(k => Bank.registerDiagram(k, DG[k]));
  Bank.gradeDiagrams = DG;

  // =========================================================== 문제별 그림 연결 (gen → 문제의 수로 그림 정보 만들기)
  // 그림에만 필요한 다른 막대·띠 조각 등은 문제의 수에서 만든 별도 난수로 정한다 (문제 출제 순서에 영향 없음)
  const CoreRng = (root.NextRoomCore || (typeof require !== 'undefined' ? require('./v5-core.js') : null)).makeRng;
  const NAMES4 = ['가', '나', '다', '라'];
  // 나머지(100 − pct)를 2~3조각으로 (가능하면 5의 배수)
  function splitRest(fr, rest) {
    const parts = []; let left = rest;
    const k = rest >= 30 ? 3 : 2;
    for (let i = 0; i < k - 1; i++) { const unit = left % 5 === 0 ? 5 : 1; const lo = unit, hi = left - unit * (k - 1 - i); const v = Math.max(lo, Math.round(fr.int(Math.ceil(lo / unit), Math.floor(hi / unit / 1.3) || 1) * unit)); parts.push(v); left -= v; }
    parts.push(left);
    return parts.filter(v => v > 0);
  }
  const deg = v => v + '°';
  const FIG = {
    u412_tri: ([a, b]) => ({ kind: 'g_tri', A: a, B: b, angles: [deg(a), deg(b), '?'] }),
    u412_quad: ([a, b, c]) => ({ kind: 'g_quad', kind2: 'quad', angles: [deg(a), deg(b), deg(c), '?'] }),
    u412_clock: ([h]) => ({ kind: 'g_clock', h }),
    u414_turn: ([a]) => ({ kind: 'g_turn', dir: 'ccw', label: deg(a) }),
    u414_turns: ([k]) => ({ kind: 'g_turn', dir: 'cw', label: '90° × ' + k }),
    u414_twice: ([a, b]) => ({ kind: 'g_turn', dir: 'cw', label: deg(a) + ' → ' + deg(b) }),
    u414_slide: ([a, c]) => ({ kind: 'g_slide', a, c }),
    u415_read: ([k, n], fr) => { const bars = NAMES4.map(nm => ({ name: nm + '반', v: k * fr.int(2, n + 2) })); const t = fr.int(0, 3); bars[t] = { name: NAMES4[t] + '반', v: k * n, label: '?', hi: true }; return { kind: 'g_bar', k, unit: '명', bars }; },
    u415_cells: ([k, n], fr) => { const bars = NAMES4.slice(0, 3).map(nm => ({ name: nm + '반', v: k * fr.int(2, n + 2) })); bars[1] = { name: '나반', v: k * n, label: k * n + '명', hi: true }; return { kind: 'g_bar', k, unit: '명', bars }; },
    u415_diff: ([k, a, b], fr) => ({ kind: 'g_bar', k, unit: '명', bars: fr.shuffle([{ name: '', v: k * a, hi: true }, { name: '', v: k * b, hi: true }, { name: '', v: k * fr.int(b, a) }]).map((x, i) => Object.assign(x, { name: NAMES4[i] + '반' })) }),
    u415_total: ([a, b, c]) => ({ kind: 'g_bar', k: 5, unit: '명', bars: [{ name: '가반', v: a, label: String(a) }, { name: '나반', v: b, label: String(b) }, { name: '다반', v: c, label: String(c) }, { name: '라반', v: null }] }),
    u415_maxmin: ([k, mx, mn], fr) => ({ kind: 'g_bar', k, unit: '개', bars: fr.shuffle([{ v: k * mx, hi: true }, { v: k * mn, hi: true }, { v: k * fr.int(mn + 1, mx - 1) }, { v: k * fr.int(mn + 1, mx - 1) }]).map((x, i) => Object.assign(x, { name: ['사과', '배', '감', '귤'][i] })) }),
    u416_square: ([n]) => ({ kind: 'g_dots', n }),
    u422_isoper: ([a, b]) => { const ba = Math.acos(b / 2 / a) * 180 / Math.PI; return { kind: 'g_tri', A: ba, B: ba, sides: [b + ' cm', a + ' cm', a + ' cm'], ticks: 2 }; },
    u422_eqside: () => ({ kind: 'g_tri', A: 60, B: 60, sides: ['? cm'], ticks: 3 }),
    u422_eqper: ([s]) => ({ kind: 'g_tri', A: 60, B: 60, sides: [s + ' cm'], ticks: 3 }),
    u422_base: ([a]) => ({ kind: 'g_tri', A: (180 - a) / 2, B: (180 - a) / 2, angles: ['?', '', deg(a)], ticks: 2 }),
    u422_apex: ([b]) => ({ kind: 'g_tri', A: b, B: b, angles: [deg(b), '', '?'], ticks: 2 }),
    u424_paraper: ([a, b]) => ({ kind: 'g_quad', kind2: 'para', acute: 62, sides: [a + ' cm', b + ' cm'] }),
    u424_paraang: ([a]) => a < 90 ? { kind: 'g_quad', kind2: 'para', acute: a, angles: [deg(a), '?'] } : { kind: 'g_quad', kind2: 'para', acute: 180 - a, angles: ['?', deg(a)] },
    u424_paraopp: ([a]) => a < 90 ? { kind: 'g_quad', kind2: 'para', acute: a, angles: [deg(a), '', '?'] } : { kind: 'g_quad', kind2: 'para', acute: 180 - a, angles: ['', deg(a), '', '?'] },
    u424_rhper: ([s]) => ({ kind: 'g_quad', kind2: 'rhombus', acute: 60, sides: [s + ' cm'] }),
    u424_rhside: () => ({ kind: 'g_quad', kind2: 'rhombus', acute: 60, sides: ['? cm'] }),
    u425_change: ([k, n], fr) => { const v1 = k * fr.int(2, 5); return { kind: 'g_line', xs: ['10시', '11시', '12시'], ys: [v1, v1 + k * n, v1 + k * n - k], base: v1 - k, step: k, unit: '℃' }; },
    u425_rise: ([a, b]) => { const st = b - a > 10 ? 2 : 1, ys = [0, 1, 2, 3, 4].map(i => Math.round(a + (b - a) * i / 4)); return { kind: 'g_line', xs: ['9시', '10시', '11시', '12시', '1시'], ys, base: a - st, step: st, unit: '℃', labels: [a + '℃', '', '', '', b + '℃'] }; },
    u425_mid: ([a, d]) => ({ kind: 'g_line', xs: ['3월', '4월', '5월'], ys: [a, null, a + d], base: a - 1, step: 1, unit: 'cm', labels: [a + ' cm', '', (a + d) + ' cm'] }),
    u425_cells: ([k, n]) => { const s = k / 10, v0 = 30 + s; return { kind: 'g_line', xs: ['1월', '2월'], ys: [v0, v0 + s * n], base: v0 - s, step: s, unit: 'kg' }; },
    u426_per: ([n, s]) => ({ kind: 'g_poly', n, side: s + ' cm' }),
    u426_side: ([n]) => ({ kind: 'g_poly', n, side: '? cm' }),
    u426_diag: ([n]) => ({ kind: 'g_poly', n }),
    u426_onevert: ([n]) => ({ kind: 'g_poly', n, mark: true }),
    u426_vert: ([n]) => ({ kind: 'g_poly', n }),
    u513_table: ([k, a]) => ({ kind: 'g_table', top: [1, 2, 3, a], bottom: [k, 2 * k, 3 * k, '?'] }),
    u513_addtable: ([k, a]) => ({ kind: 'g_table', top: [1, 2, 3, a], bottom: [1 + k, 2 + k, 3 + k, '?'] }),
    u516_rect: ([a, b]) => ({ kind: 'g_area', shape: 'rect', a: a + ' cm', b: b + ' cm' }),
    u516_rectper: ([a, b]) => ({ kind: 'g_area', shape: 'rect', a: a + ' cm', b: b + ' cm' }),
    u516_para: ([a, h]) => ({ kind: 'g_area', shape: 'para', a: a + ' cm', h: h + ' cm' }),
    u516_tri: ([a, h]) => ({ kind: 'g_area', shape: 'tri', a: a + ' cm', h: h + ' cm' }),
    u516_trap: ([a, b, h]) => ({ kind: 'g_area', shape: 'trap', a: a + ' cm', b: b + ' cm', h: h + ' cm' }),
    u516_rhom: ([p, q]) => ({ kind: 'g_area', shape: 'rhom', p: p + ' cm', q: q + ' cm' }),
    u516_sq: ([s]) => ({ kind: 'g_area', shape: 'square', a: '? cm', inner: s * s + ' cm²' }),
    u521_incl: ([a, b]) => ({ kind: 'g_numline', a, b, inc: true }),
    u521_excl: ([a, b]) => ({ kind: 'g_numline', a, b, inc: false }),
    u523_corr: ([a, b]) => ({ kind: 'g_cong', A: a, B: b }),
    u523_iso: ([b]) => ({ kind: 'g_tri', A: b, B: b, angles: [deg(b), '', '?'], ticks: 2 }),
    u525_parts: () => ({ kind: 'g_box' }),
    u525_fact: () => ({ kind: 'g_box' }),
    u525_edges: ([a, b, c]) => ({ kind: 'g_box', a: a + ' cm', b: b + ' cm', c: c + ' cm' }),
    u525_cubeEdges: ([s]) => ({ kind: 'g_box', cube: true, a: s + ' cm' }),
    u525_cubeSide: () => ({ kind: 'g_box', cube: true, a: '? cm' }),
    u526_sure: ([c, k]) => ({ kind: 'g_bag', balls: [{ color: { 흰: '#f8fafc', 노란: '#facc15', 빨간: '#ef4444' }[c], count: k }] }),
    u526_half: ([k]) => ({ kind: 'g_bag', balls: [{ color: '#ef4444', count: k }, { color: '#3b82f6', count: k }] }),
    u612_prism0: ([n]) => ({ kind: 'g_solid', n }), u612_prism1: ([n]) => ({ kind: 'g_solid', n }), u612_prism2: ([n]) => ({ kind: 'g_solid', n }),
    u612_pyr0: ([n]) => ({ kind: 'g_solid', n, pyramid: true }), u612_pyr1: ([n]) => ({ kind: 'g_solid', n, pyramid: true }), u612_pyr2: ([n]) => ({ kind: 'g_solid', n, pyramid: true }),
    u615_count: ([n, pct], fr) => { const segs = [{ name: '가', pct, txt: pct + '%', hi: true }].concat(splitRest(fr, 100 - pct).map((v, i) => ({ name: ['나', '다', '라'][i], pct: v }))); return { kind: 'g_band', segs, total: '전체 ' + n + '명' }; },
    u615_pct: ([n, k], fr) => { const pct = k * 100 / n; return { kind: 'g_pie', segs: [{ name: '가 (' + k + '명)', pct, txt: '?', hi: true }].concat(splitRest(fr, 100 - pct).map((v, i) => ({ name: ['나', '다', '라'][i], pct: v }))) }; },
    u615_deg: ([pct], fr) => ({ kind: 'g_pie', segs: [{ name: '가', pct, txt: pct + '%', hi: true }].concat(splitRest(fr, 100 - pct).map((v, i) => ({ name: ['나', '다', '라'][i], pct: v }))) }),
    u615_pict: ([a, b]) => ({ kind: 'g_pict', a, b }),
    u615_band: ([pct], fr) => ({ kind: 'g_band', segs: [{ name: '가', pct, txt: pct + '%', hi: true }].concat(splitRest(fr, 100 - pct).map((v, i) => ({ name: ['나', '다', '라'][i], pct: v }))), total: '띠 전체 길이 20 cm' }),
    u616_vol: ([a, b, c]) => ({ kind: 'g_box', a: a + ' cm', b: b + ' cm', c: c + ' cm' }),
    u616_area: ([a, b, c]) => ({ kind: 'g_box', a: a + ' cm', b: b + ' cm', c: c + ' cm' }),
    u616_cubeVol: ([s]) => ({ kind: 'g_box', cube: true, a: s + ' cm' }),
    u616_cubeArea: ([s]) => ({ kind: 'g_box', cube: true, a: s + ' cm' }),
    u616_height: ([a, b]) => ({ kind: 'g_box', a: a + ' cm', b: b + ' cm', c: '? cm' })
  };
  function attachFigure(c) {
    if (!c || !FIG[c.gen]) return c;
    const fr = CoreRng('fig', c.gen, JSON.stringify(c.params));
    const spec = FIG[c.gen](c.params, fr);
    if (spec) c.diagram = spec;
    return c;
  }
  Object.keys(units).forEach(id => { const raw = units[id].core; units[id].core = (r, v) => attachFigure(raw(r, v)); });
  Bank.gradeFigures = FIG;

  Object.keys(units).forEach(id => Bank.registerUnit(+id, units[id]));
  // 학기 안 순서는 출판사 목차가 아니라 교육과정 영역 순서: 수와 연산 → 변화와 관계 → 도형과 측정 → 자료와 가능성
  const GRADE_GROUPS = [['4-1', [411, 413, 416, 412, 414, 415]], ['4-2', [421, 423, 422, 424, 426, 425]], ['5-1', [511, 512, 514, 515, 513, 516]], ['5-2', [521, 522, 524, 523, 525, 526]], ['6-1', [611, 613, 614, 612, 616, 615]], ['6-2', [1, 2, 4, 3, 5, 6]]];
  Bank.GRADE_GROUPS = GRADE_GROUPS;
  Bank.gradeUnits = units;
  if (typeof module !== 'undefined' && module.exports) module.exports = { units, GRADE_GROUPS };
})(typeof window !== 'undefined' ? window : globalThis);
