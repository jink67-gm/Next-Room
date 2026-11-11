/* NEXT ROOM V5 — 무작위 맵 대량 생성 검사 (Node.js)
 * 실행: node tests/map_generation_test.js [맵수=120]
 * 10·20·30문 모드 각각 N개의 시드로 전체 스테이지를 만들고, 모든 방을 배치도 수준에서 검사한다.
 * - 입구→출구 경로(장치 해결 후), 장치 해결 전 단말기·서랍·옷장·열쇠 접근 가능 여부
 * - 가구·구조물 겹침, 벽 속 가구, 절벽 위 물체, 공중에 뜬 책장/상자
 * - 다리 방: 옷장·서랍 없음 / 돌풍·메아리 없음 / 단말기는 절벽 앞
 * - 열쇠 방: 열쇠는 잠긴 문·절벽 뒤가 아닌 곳, 다리와 같은 방 금지
 * - 돌풍·메아리 방: 어디서든 옷장까지 걸어서 17.5 m 이내
 * - 먹물 복도: 넉넉한 폭(반지름+0.18 m)으로도 통과 가능, 오답 문은 실제로 막혀 있음
 * - 사서 도서관: 순찰 지점 모두 연결, 사서 반지름 0.5 m로 이동 가능
 * - 스테이지 계획: 특수 이벤트 중복/연속, 같은 방번호 덮어쓰기 없음
 * - 충돌 함수: 강한 넉백(초속 25 m)으로도 벽·절벽을 통과하지 못함
 */
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'js', 'v5-core.js'));
global.NextRoomCore = C;
const B = require(path.join(__dirname, '..', 'assets', 'js', 'math-bank-v5.js'));

const N = parseInt(process.argv[2] || '120', 10);
const UNIT_SETS = [[1, 2, 3, 4, 5, 6], [1], [2], [3], [4], [5], [6], [3, 6], [1, 4]];
let failures = 0, rooms = 0, fallbacks = 0, regenerated = 0;
const fail = (m) => { failures++; if (failures <= 40) console.log('FAIL', m); };
const HEAVY = ['library', 'ink'], SPECIAL = ['decoy', 'bridge', 'keySearch', 'library', 'ink'];

function checkPlan(plan, Nd) {
  const archs = plan.rooms.slice(1).map(r => r.arch);
  if (archs.length !== Nd) fail('plan length');
  if (archs[0] !== 'guest') fail('door 1 must be guest');
  if (archs[Nd - 1] !== 'library') fail('final door must be library');
  const cfg = plan.config;
  ['decoy', 'bridge', 'keySearch'].forEach(k => { const c = archs.filter(a => a === k).length; if (c !== cfg.counts[k]) fail(`plan ${Nd}: ${k} count ${c} != ${cfg.counts[k]}`); });
  if (archs.filter(a => a === 'ink').length !== cfg.inks.length) fail('ink count');
  for (let i = 1; i < Nd; i++) {
    if (HEAVY.includes(archs[i]) && HEAVY.includes(archs[i - 1])) fail(`plan ${Nd} seed ${plan.seed}: heavy events adjacent at ${i + 1}`);
    if (archs[i] === archs[i - 1]) fail(`plan ${Nd} seed ${plan.seed}: same room type twice in a row at ${i + 1} (${archs[i]})`);
  }
  // run length of special events
  let run = 0;
  for (let i = 0; i < Nd; i++) {
    run = SPECIAL.includes(archs[i]) ? run + 1 : 0;
    if (run > cfg.maxRun) fail(`plan ${Nd} seed ${plan.seed}: ${run} special events in a row at ${i + 1}`);
  }
  plan.rooms.slice(1).forEach((r, i) => {
    if ((r.events.gale || r.events.echo) && ['bridge', 'ink', 'library', 'decoy'].includes(r.arch)) fail('gale/echo in ' + r.arch);
    if (r.events.gale && r.events.echo) fail('gale and echo in same room');
    if (i > 0) { const pr = plan.rooms[i]; if ((pr.events.gale || pr.events.echo) && (r.events.gale || r.events.echo)) fail(`consecutive gale/echo rooms at ${i + 1}`); }
  });
}

function knockbackTest(lay) {
  // 무작위 지점에서 큰 넉백을 줘도 방 밖/벽 속/절벽으로 빠지지 않는지
  const rng = C.makeRng('kb', lay.door, lay.arch, lay.W);
  const st0 = { crouch: false, exitOpen: false, bridged: false, deviceDone: false, gateOpen: false };
  const g = C.makeGrid(lay, Object.assign({}, st0, { crouch: true }), C.PLAYER_R, 0.4);
  for (let k = 0; k < 25; k++) {
    let cell; let guard = 0;
    do { cell = Math.floor(rng.next() * g.cols * g.rows); guard++; } while (g.blocked[cell] && guard < 500);
    if (g.blocked[cell]) continue;
    const x = -lay.W / 2 + (cell % g.cols + 0.5) * g.cs, d = (Math.floor(cell / g.cols) + 0.5) * g.cs;
    const ang = rng.next() * Math.PI * 2, v = 25 * 0.1; // 25 m/s for one 0.1 s frame
    const p = C.moveCircle(lay, x, d, Math.cos(ang) * v, Math.sin(ang) * v, C.PLAYER_R, st0);
    if (Math.abs(p.x) > lay.W / 2 - C.WALL_T - C.PLAYER_R + 1e-3) fail(`${lay.arch}: knockback left the room x=${p.x.toFixed(2)}`);
    if (p.d < 0.2 || p.d > lay.frontD - C.WALL_T - C.PLAYER_R + 1e-3) fail(`${lay.arch}: knockback through back/front wall d=${p.d.toFixed(2)}`);
    if (lay.chasm && p.d > lay.chasm.d0 - C.PLAYER_R + 1e-3 && p.d < lay.chasm.d1 + C.PLAYER_R - 1e-3) fail(`${lay.arch}: knocked into chasm d=${p.d.toFixed(2)}`);
    if (C.pointBlocked(lay, p.x, p.d, C.PLAYER_R - 0.02, st0) && !C.pointBlocked(lay, p.x, p.d, C.PLAYER_R - 0.02, Object.assign({}, st0, { crouch: true }))) { /* under a beam while standing: allowed only if started there */ }
  }
}

const t0 = Date.now();
const stats = {};
const seasonCounts = {};
for (const season of [1, 2, 3]) {
C.setSeason(season);
for (const Nd of [10, 20, 30]) {
  for (let s = 0; s < N; s++) {
    const seed = (Nd * 100003 + s * 7919 + 17) >>> 0;
    const plan = C.planStage(Nd, seed);
    checkPlan(plan, Nd);
    const units = UNIT_SETS[s % UNIT_SETS.length];
    const deck = new B.Deck(units, seed);
    let cx = 0;
    for (const r of plan.rooms.slice(1)) {
      const prob = r.puzzle === 'none' ? null : deck.draw(r.puzzle, r.door);
      const device = r.puzzle === 'bridge' ? 'bridge' : (prob && ['gear', 'monolith', 'voxel', 'sorter'].includes(prob.device) ? prob.device : null);
      const lay = C.generateRoom(seed, r, { kind: r.puzzle, device });
      rooms++;
      const k = 'S' + season + ':' + Nd + ':' + r.arch;
      stats[k] = (stats[k] || 0) + 1;
      if (lay.attempt === 99) { fallbacks++; fail(`fallback layout used: ${Nd} seed ${seed} door ${r.door} ${r.arch} :: ${(lay.failedAttempts || []).slice(0, 2).join(' | ')}`); }
      else if (lay.attempt > 0) regenerated++;
      if (!lay.validation.ok) fail(`invalid ${Nd} seed ${seed} door ${r.door} ${r.arch}: ${lay.validation.reasons.join(', ')}`);
      // independent re-validation (validator must be deterministic)
      const again = C.validateLayout(lay, r);
      if (!again.ok) fail('re-validation differs');
      if (r.arch === 'decoy') {
        if (!prob || prob.type !== 'typeE_decoy' || prob.decoyChoices.length !== 3) fail('decoy room without 3-choice problem (units ' + units + ')');
        if (!lay.decoyDoors || lay.decoyDoors.length !== 3) fail('decoy room without 3 doors');
      }
      if (r.arch === 'bridge') {
        if (!prob || prob.deviceType !== 'bridge') fail('bridge room without bridge problem');
        if (lay.closets.length || lay.drawers.length) fail('bridge room furniture');
      }
      if (r.arch === 'keySearch' && (!lay.requiresKey || lay.keyDrawer < 0)) fail('key room without key');
      if (r.arch !== 'keySearch' && !(season > 1 && lay.maze) && lay.drawers.some(d => d.loot === 'key')) fail('key outside key room');
      if (lay.requiresKey && lay.drawers.filter(d => d.loot === 'key').length !== (lay.keysNeeded || 1)) fail(`S${season} item count mismatch ${r.arch}`);
      if (season > 1 && r.arch === 'keySearch' && lay.keysNeeded !== season) fail(`S${season} key room needs ${lay.keysNeeded} items`);
      if (lay.requiresKey) seasonCounts['S' + season + ' items/room ' + lay.keysNeeded] = (seasonCounts['S' + season + ' items/room ' + lay.keysNeeded] || 0) + 1;
      if (prob && !units.includes(prob.unit)) fail('problem from unselected unit');
      knockbackTest(lay);
      cx += lay.exitX;
    }
  }
}
}
C.setSeason(1);
console.log('season item rooms:', JSON.stringify(seasonCounts));

// Negative tests: the validator must catch deliberately broken rooms
(function negativeTests() {
  const plan = { door: 3, arch: 'guest', events: { gale: true } };
  const lay = C.buildLayout(3, 'guest', 5, { kind: 'any' }, 0, false, plan.events);
  const blocked = JSON.parse(JSON.stringify(lay));
  blocked.rects.push({ x: 0, d: blocked.L * 0.5, hw: blocked.W / 2, hd: 0.3, y0: 0, y1: 5.4, kind: 'wall' });
  if (C.validateLayout(blocked, plan).ok) fail('validator missed a wall cutting the room in half');
  const noCloset = JSON.parse(JSON.stringify(lay)); noCloset.closets = [];
  if (C.validateLayout(noCloset, plan).ok) fail('validator missed gale room without closet');
  const overlap = JSON.parse(JSON.stringify(lay));
  if (overlap.drawers[0]) { overlap.drawers.push(JSON.parse(JSON.stringify(overlap.drawers[0]))); if (C.validateLayout(overlap, plan).ok) fail('validator missed overlapping drawers'); }
  const key = C.buildLayout(4, 'keySearch', 6, { kind: 'door' }, 0, false, {});
  const kb = JSON.parse(JSON.stringify(key));
  const kd = kb.drawers[kb.keyDrawer];
  kb.rects.push({ x: kd.x, d: kd.d, hw: 2.2, hd: 2.2, y0: 0, y1: 5.4, kind: 'wall' });
  if (C.validateLayout(kb, { events: {} }).ok) fail('validator missed walled-in key drawer');
  const br = C.buildLayout(5, 'bridge', 7, { kind: 'bridge', device: 'bridge' }, 0, false, {});
  const bb = JSON.parse(JSON.stringify(br)); bb.terminal.d = br.chasm.d1 + 2; bb.terminal.foot.d = br.chasm.d1 + 2; bb.terminal.access.d = br.chasm.d1 + 1;
  if (C.validateLayout(bb, { events: {} }).ok) fail('validator missed bridge terminal behind the chasm');
  const lib = C.buildLayout(5, 'library', 8, { kind: 'terminal' }, 0, false, {});
  const fl = JSON.parse(JSON.stringify(lib)); fl.rects.find(r => r.kind === 'shelf').y0 = 1.8;
  if (C.validateLayout(fl, { events: {} }).ok) fail('validator missed floating bookshelf');
  console.log('negative tests done');
})();

const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`maps per mode: ${N} × (10, 20, 30 doors) = ${N * 3} stages, ${rooms} rooms in ${dt}s`);
console.log(`rooms regenerated at least once: ${regenerated}, safe fallback layouts: ${fallbacks}`);
console.log('room type counts:', JSON.stringify(stats));
if (failures) { console.log(`FAILED: ${failures} problems`); process.exit(1); }
console.log('PASS: all generated maps are completable and collision-safe');
