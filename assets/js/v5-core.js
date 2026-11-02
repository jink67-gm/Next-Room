/* MATH DOORS V5 — core logic (no Three.js dependency)
 * - seeded random numbers
 * - stage event plan for 10 / 20 / 30 door modes
 * - room layout generator (logical layout: walls, furniture, devices)
 * - collision resolver shared by the game and the validator
 * - grid path search (reachability validation, Figure navigation)
 * - checkpoint save/load
 * Works in the browser (window.MathDoorsCore) and in Node (module.exports) for automated tests.
 */
(function (root) {
  'use strict';

  const CORE_VERSION = '5.0.0';
  // V6 시즌: 1 = 호텔(쉬움), 2 = 지하 하수도·보일러실(보통), 3 = 무너지는 성(도전/최종)
  //  - 시즌마다 계획표·방 배치 난수가 달라져 같은 시드라도 맵이 다름 (시즌 1은 예전 맵 그대로)
  //  - 진행 아이템: 열쇠 방에 필요한 개수 시즌1 1개 / 시즌2 퓨즈 2개 / 시즌3 룬 조각 3개, 시즌2·3은 미로 방도 아이템을 요구
  let SEASON = 1;
  function setSeason(n) { SEASON = (n === 2 || n === 3) ? n : 1; }
  function getSeason() { return SEASON; }
  const sKey = () => (SEASON > 1 ? 's' + SEASON : null);
  const ROOM_H = 5.4;
  const PLAYER_R = 0.42;
  const WALL_T = 0.14;          // half thickness of outer walls
  const DOOR_HALF = 1.2;        // half width of a normal door opening
  const INTERACT = { closet: 2.75, drawer: 2.25, terminal: 2.8, door: 2.85 };

  // ---------------------------------------------------------------------------
  // Seeded RNG
  // ---------------------------------------------------------------------------
  function hashStr(...parts) {
    let h = 2166136261 >>> 0;
    const s = parts.join('|');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(...parts) {
    const r = mulberry32(hashStr(...parts));
    const api = {
      next: r,
      int(a, b) { return a + Math.floor(r() * (b - a + 1)); },
      range(a, b) { return a + r() * (b - a); },
      pick(arr) { return arr[Math.floor(r() * arr.length)]; },
      chance(p) { return r() < p; },
      sign() { return r() < 0.5 ? -1 : 1; },
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
      }
    };
    return api;
  }
  function newSeed() {
    let s = 0;
    try {
      if (root.crypto && root.crypto.getRandomValues) { const a = new Uint32Array(1); root.crypto.getRandomValues(a); s = a[0]; }
    } catch (_) { /* ignore */ }
    if (!s) s = Math.floor(Math.random() * 4294967295);
    return s >>> 0;
  }

  // ---------------------------------------------------------------------------
  // Stage plan (event schedule) — built BEFORE any room
  // ---------------------------------------------------------------------------
  // V5.2: 일자형 방이 줄어들도록 지그재그(zigzag)·엇갈린 벽(slalom)을 추가하고 두 번씩 넣어 자주 나오게 함
  // 미로형 객실층(maze)은 3배, 지그재그·엇갈린 벽은 1배 → 일자형 방이 드물게 나옴
  const FILLERS = ['guest', 'storage', 'grandHall', 'lCorridor', 'uCorridor', 'shortcutHall', 'secretWing', 'zigzag', 'slalom', 'maze', 'maze', 'maze', 'maze'];
  const MEDIUM = ['dupe', 'bridge', 'keySearch'];
  const HEAVY = ['library', 'seek'];
  const SPECIAL = new Set(MEDIUM.concat(HEAVY));
  const ARCH_LABELS = {
    guest: '🛏️ 객실 구역', storage: '📦 화물 창고', grandHall: '🏛️ 중앙 장치 홀', lCorridor: '↪️ ㄱ자 굴절 복도',
    uCorridor: '🔀 ㄷ자 굽은 복도', shortcutHall: '🕳️ 지름길 · 우회로', secretWing: '🕯️ 비밀방이 있는 별관',
    darkRoom: '🌑 암흑 구역', dupe: '🚪 갈림길 구역', bridge: '🌉 끊어진 다리 구역', keySearch: '🗝️ 열쇠 탐색 곁방',
    seek: '👁️ 긴 복도 추격', library: '📚 고대 도서관',
    zigzag: '〰️ 지그재그 복도', slalom: '🧱 엇갈린 벽 홀', maze: '🧭 미로 객실층'
  };
  const RUSH_ARCHS = new Set(['guest', 'storage', 'grandHall', 'lCorridor', 'uCorridor', 'shortcutHall', 'secretWing', 'darkRoom', 'keySearch', 'zigzag', 'slalom', 'maze']);

  function stageConfig(N) {
    const mid = Math.max(4, Math.round(N / 2));
    if (N <= 12) return { N, libs: [mid, N], seeks: [Math.max(3, N - 2)], counts: { dupe: 1, bridge: 1, keySearch: 1 }, dark: 1, maxRun: 2 };
    if (N <= 24) return { N, libs: [mid, N], seeks: [Math.max(4, Math.round(N * 0.35))], counts: { dupe: 2, bridge: 2, keySearch: 2 }, dark: 2, maxRun: 1 };
    return { N, libs: [mid, N], seeks: [Math.round(N * 0.27), Math.round(N * 0.77)], counts: { dupe: 3, bridge: 3, keySearch: 3 }, dark: 3, maxRun: 1 };
  }

  function planStage(N, seed) {
    const cfg = stageConfig(N);
    for (let attempt = 0; attempt < 400; attempt++) {
      const rng = SEASON > 1 ? makeRng('plan', seed, N, attempt, sKey()) : makeRng('plan', seed, N, attempt);
      const arch = new Array(N + 1).fill(null);
      arch[1] = 'guest';
      cfg.libs.forEach(d => { arch[d] = 'library'; });
      cfg.seeks.forEach(d => { if (!arch[d]) arch[d] = 'seek'; });
      // mediums
      const mediums = [];
      Object.keys(cfg.counts).forEach(k => { for (let i = 0; i < cfg.counts[k]; i++) mediums.push(k); });
      const order = rng.shuffle(mediums);
      const isSpecial = d => d >= 1 && d <= N && arch[d] && SPECIAL.has(arch[d]);
      const runLenIf = (d) => {
        let len = 1, a = d - 1, b = d + 1;
        while (isSpecial(a)) { len++; a--; }
        while (isSpecial(b)) { len++; b++; }
        return len;
      };
      let ok = true;
      for (const m of order) {
        const slots = rng.shuffle(Array.from({ length: N - 1 }, (_, i) => i + 2).filter(d => !arch[d]));
        let placed = false;
        for (const d of slots) {
          if (runLenIf(d) > cfg.maxRun + (cfg.maxRun === 1 ? 0 : 0)) continue;
          // same type must not repeat within 3 doors
          let near = false;
          for (let k = d - 3; k <= d + 3; k++) if (k !== d && arch[k] === m) near = true;
          if (near) continue;
          // bridge never directly after a chase/boss (recovery room)
          if (m === 'bridge' && HEAVY.includes(arch[d - 1])) continue;
          arch[d] = m; placed = true; break;
        }
        if (!placed) { ok = false; break; }
      }
      if (!ok) continue;
      // heavy rooms must not touch each other
      let heavyAdj = false;
      for (let d = 2; d <= N; d++) if (HEAVY.includes(arch[d]) && HEAVY.includes(arch[d - 1])) heavyAdj = true;
      if (heavyAdj) continue;
      // fillers + dark rooms
      const freeSlots = [];
      for (let d = 2; d <= N; d++) if (!arch[d]) freeSlots.push(d);
      const darkSlots = [];
      for (const d of rng.shuffle(freeSlots)) {
        if (darkSlots.length >= cfg.dark) break;
        if (darkSlots.some(x => Math.abs(x - d) <= 2)) continue;
        darkSlots.push(d);
      }
      if (darkSlots.length < cfg.dark) continue;
      darkSlots.forEach(d => { arch[d] = 'darkRoom'; });
      let pool = rng.shuffle(FILLERS.filter(f => f !== 'guest'));
      let pi = 0;
      for (let d = 2; d <= N; d++) {
        if (arch[d]) continue;
        let tries = 0, f;
        do {
          if (pi >= pool.length) { pool = rng.shuffle(FILLERS); pi = 0; }
          f = pool[pi++]; tries++;
        } while ((f === arch[d - 1] || f === arch[d + 1] || f === arch[d - 2]) && tries < 20);
        arch[d] = f;
      }
      // V5.2: 미로 방 최소 개수 보장 (10문 1개, 20문 3개, 30문 5개)
      const wantMaze = Math.max(1, Math.round(N / 6)) + (SEASON === 2 ? 1 : 0);
      let haveMaze = arch.filter(a => a === 'maze').length;
      for (const d of rng.shuffle(Array.from({ length: N - 1 }, (_, i) => i + 2))) {
        if (haveMaze >= wantMaze) break;
        if (!FILLERS.includes(arch[d]) || arch[d] === 'maze') continue;
        if (arch[d - 1] === 'maze' || arch[d + 1] === 'maze') continue;
        arch[d] = 'maze'; haveMaze++;
      }
      // monster events
      const plan = [null];
      let lastDanger = -9;
      for (let d = 1; d <= N; d++) {
        const a = arch[d];
        const e = { rush: false, ambush: false, screech: false };
        const recovering = d > 1 && HEAVY.includes(arch[d - 1]);
        if (d >= 3 && RUSH_ARCHS.has(a) && !recovering && d - lastDanger >= 2) {
          const r = rng.next();
          const pr = SEASON === 3 ? 0.46 : (SEASON === 2 ? 0.42 : 0.40), pa = SEASON === 3 ? 0.76 : (SEASON === 2 ? 0.66 : 0.62);
          if (r < pr) e.rush = true;
          else if (d >= 4 && r < pa) e.ambush = true;
          if (e.rush || e.ambush) lastDanger = d;
        }
        if (a === 'darkRoom') e.screech = true;
        else if (!e.rush && !e.ambush && !['seek', 'library', 'bridge'].includes(a) && d >= 2) e.screech = rng.chance(SEASON === 3 ? 0.36 : (SEASON === 2 ? 0.28 : 0.22));
        plan.push({ door: d, arch: a, label: ARCH_LABELS[a], events: e, puzzle: puzzleKindFor(a) });
      }
      // guarantee at least one rush and one ambush where possible
      const ensure = (key) => {
        if (plan.some(p => p && p.events[key])) return;
        for (let d = 3; d <= N; d++) {
          const p = plan[d];
          if (!RUSH_ARCHS.has(p.arch) || p.events.rush || p.events.ambush) continue;
          if (key === 'ambush' && d < 4) continue;
          const prev = plan[d - 1], next = plan[d + 1];
          if ((prev && (prev.events.rush || prev.events.ambush)) || (next && (next.events.rush || next.events.ambush))) continue;
          if (prev && HEAVY.includes(prev.arch)) continue;
          p.events[key] = true; p.events.screech = false; return;
        }
      };
      ensure('rush'); ensure('ambush');
      return { seed, N, attempt, rooms: plan, config: cfg };
    }
    throw new Error('stage plan failed');
  }

  function puzzleKindFor(arch) {
    if (arch === 'dupe') return 'dupe';
    if (arch === 'bridge') return 'bridge';
    if (arch === 'seek') return 'none';
    if (arch === 'keySearch') return 'door';
    if (arch === 'library') return 'terminal';
    return 'any';
  }

  // ---------------------------------------------------------------------------
  // Room layout model (local coordinates: x across, d = depth from entrance 0..L)
  // ---------------------------------------------------------------------------
  function rect(x, d, hw, hd, kind, extra) {
    return Object.assign({ x, d, hw, hd, y0: 0, y1: ROOM_H, kind, crouch: false }, extra || {});
  }
  function circle(x, d, r, kind, extra) { return Object.assign({ x, d, r, kind }, extra || {}); }

  function rectActive(rc, st) {
    if (rc.off && st && st[rc.off]) return false;
    if (rc.on && !(st && st[rc.on])) return false;
    if (rc.crouch && st && st.crouch) return false;
    return true;
  }

  function newLayout(door, arch, W, L, rng) {
    return {
      v: CORE_VERSION, door, arch, W, L, frontD: L, exitX: 0, hasEntrance: door > 1,
      rects: [], circles: [], closets: [], drawers: [], props: [], wallDecor: [],
      terminal: null, device: null, chasm: null, gate: null, creaks: [], figure: null,
      requiresKey: false, keyDrawer: -1, dupeDoors: null, secret: null, accent: null,
      theme: arch === 'darkRoom' ? 'darkRoom' : (arch === 'library' ? 'library' : 'normal'),
      lightLevel: arch === 'darkRoom' ? 0.03 : (arch === 'library' ? 0.62 : 1.0),
      notes: []
    };
  }

  // Footprint helpers ---------------------------------------------------------
  function closetAt(lay, side, d) {
    const W = lay.W;
    const cx = side * (W / 2 - 0.72);
    return {
      side, d, x: cx,
      foot: rect(side * (W / 2 - 0.76), d, 0.66, 1.13, 'closet'),
      worldOffX: side * (W / 2 - 0.72 - 0.9),      // interaction point (V4 semantics)
      insideOffX: side * (W / 2 - 0.72 - 0.1),
      outsideOffX: side * (W / 2 - 0.72 - 1.85),
      access: { x: side * (W / 2 - 0.72 - 1.85), d }
    };
  }
  function drawerAt(lay, side, d, loot) {
    const W = lay.W;
    const x = side * (W / 2 - 0.70);
    return { side, d, x, loot, rot: side < 0 ? Math.PI / 2 : -Math.PI / 2, foot: rect(x, d, 0.55, 0.94, 'drawer'), access: { x: x - side * 1.35, d } };
  }

  function rectsOverlap(a, b, m) {
    m = m || 0;
    return Math.abs(a.x - b.x) < a.hw + b.hw + m && Math.abs(a.d - b.d) < a.hd + b.hd + m;
  }
  function circleRect(c, r, m) {
    m = m || 0;
    const dx = Math.max(Math.abs(c.x - r.x) - r.hw, 0), dd = Math.max(Math.abs(c.d - r.d) - r.hd, 0);
    return Math.hypot(dx, dd) < c.r + m;
  }
  function footprints(lay) {
    const out = [];
    lay.rects.forEach(r => { if (r.kind !== 'chasm' || true) out.push({ shape: 'rect', o: r, tag: r.kind }); });
    lay.circles.forEach(c => out.push({ shape: 'circle', o: c, tag: c.kind }));
    lay.closets.forEach(c => out.push({ shape: 'rect', o: c.foot, tag: 'closet' }));
    lay.drawers.forEach(dr => out.push({ shape: 'rect', o: dr.foot, tag: 'drawer' }));
    lay.props.forEach(p => out.push(p.shape === 'rect' ? { shape: 'rect', o: p.foot, tag: 'prop' } : { shape: 'circle', o: p.foot, tag: 'prop' }));
    if (lay.terminal && lay.terminal.foot) out.push({ shape: 'circle', o: lay.terminal.foot, tag: 'terminal' });
    return out;
  }
  function fpOverlap(a, b, m) {
    if (a.shape === 'rect' && b.shape === 'rect') return rectsOverlap(a.o, b.o, m);
    if (a.shape === 'circle' && b.shape === 'rect') return circleRect(a.o, b.o, m);
    if (a.shape === 'rect' && b.shape === 'circle') return circleRect(b.o, a.o, m);
    return Math.hypot(a.o.x - b.o.x, a.o.d - b.o.d) < a.o.r + b.o.r + (m || 0);
  }
  function fitsFree(lay, cand, margin) {
    const W = lay.W, L = lay.L;
    const o = cand.o;
    if (cand.shape === 'rect') {
      if (Math.abs(o.x) + o.hw > W / 2 - 0.02 || o.d - o.hd < 0.05 || o.d + o.hd > lay.frontD - 0.05) return false;
    } else {
      if (Math.abs(o.x) + o.r > W / 2 - WALL_T || o.d - o.r < 0.2 || o.d + o.r > lay.frontD - 0.2) return false;
    }
    // doorway clear zones
    const zones = [rect(0, 1.3, 1.9, 1.3, 'zone'), rect(lay.exitX, lay.frontD - 1.4, 1.9, 1.4, 'zone')];
    if (lay.dupeDoors) lay.dupeDoors.forEach(dd => zones.push(rect(dd.x, lay.frontD - 1.4, 1.6, 1.4, 'zone')));
    for (const z of zones) if (fpOverlap(cand, { shape: 'rect', o: z }, 0)) return false;
    for (const f of footprints(lay)) {
      if (f.o === o) continue;
      if (f.tag === 'beam' || f.tag === 'creak') continue;
      if (fpOverlap(cand, f, margin == null ? 0.25 : margin)) return false;
    }
    return true;
  }
  function placeCloset(lay, side, dList) {
    for (const d of dList) {
      const c = closetAt(lay, side, d);
      if (!fitsFree(lay, { shape: 'rect', o: c.foot }, 0.3)) continue;
      // access point must not be inside another obstacle
      if (pointBlocked(lay, c.access.x, c.access.d, PLAYER_R + 0.05, { crouch: true })) continue;
      lay.closets.push(c); return c;
    }
    return null;
  }
  function placeDrawer(lay, side, dList, loot) {
    for (const d of dList) {
      const dr = drawerAt(lay, side, d, loot);
      if (!fitsFree(lay, { shape: 'rect', o: dr.foot }, 0.3)) continue;
      if (pointBlocked(lay, dr.access.x, dr.access.d, PLAYER_R + 0.05, { crouch: true })) continue;
      lay.drawers.push(dr); return dr;
    }
    return null;
  }
  function placeProp(lay, type, x, d, r, extra) {
    const p = Object.assign({ type, x, d, shape: 'circle', foot: circle(x, d, r, 'prop') }, extra || {});
    if (!fitsFree(lay, { shape: 'circle', o: p.foot }, 0.35)) return null;
    lay.props.push(p); return p;
  }
  function placeRectProp(lay, type, x, d, hw, hd, extra) {
    const p = Object.assign({ type, x, d, shape: 'rect', foot: rect(x, d, hw, hd, 'prop') }, extra || {});
    if (!fitsFree(lay, { shape: 'rect', o: p.foot }, 0.35)) return null;
    lay.props.push(p); return p;
  }
  // 단말기 앞에 서서 E를 눌렀는데 옷장이 먼저 열리지 않도록, 단말기 접근점과 옷장 사이 거리를 3.2 m 이상 둔다 (V5.2)
  function nearCloset(lay, x, d) { return (lay.closets || []).some(c => Math.hypot(c.x - x, c.d - d) < 3.2 || Math.hypot(c.access.x - x, c.access.d - d) < 2.2); }
  function placeTerminal(lay, mode, candidates) {
    if (mode === 'keypad') {
      const W = lay.W;
      for (const s of [1, -1]) {
        const kx = lay.exitX + s * 1.85;
        if (Math.abs(kx) > W / 2 - 0.6) continue;
        lay.terminal = { mode: 'keypad', x: kx, d: lay.frontD, access: { x: kx, d: lay.frontD - 0.9 }, foot: null };
        if (!pointBlocked(lay, kx, lay.frontD - 0.9, PLAYER_R, { crouch: true }) && !nearCloset(lay, kx, lay.frontD - 0.9)) return lay.terminal;
      }
      lay.terminal = null;
      return null;
    }
    for (const c of candidates) {
      const t = { mode: 'stand', x: c.x, d: c.d, access: { x: c.x, d: c.d - 1.0 }, foot: circle(c.x, c.d, 0.5, 'terminal') };
      if (!fitsFree(lay, { shape: 'circle', o: t.foot }, 0.4)) continue;
      if (nearCloset(lay, t.access.x, t.access.d)) continue;
      lay.terminal = t;
      if (pointBlocked(lay, t.access.x, t.access.d, PLAYER_R, { crouch: true })) { lay.terminal = null; continue; }
      return t;
    }
    return null;
  }

  function wallSegmentsZ(lay, x, d0, d1, gaps, kind) {
    // wall running along depth (constant x) from d0 to d1 with gaps [{a,b}]
    const pieces = [];
    let cur = d0;
    (gaps || []).slice().sort((p, q) => p.a - q.a).forEach(g => { if (g.a > cur) pieces.push([cur, g.a]); cur = Math.max(cur, g.b); });
    if (d1 > cur) pieces.push([cur, d1]);
    pieces.forEach(([a, b]) => { if (b - a > 0.05) lay.rects.push(rect(x, (a + b) / 2, 0.15, (b - a) / 2, kind || 'wall')); });
  }
  function wallSegmentsX(lay, d, x0, x1, gaps, kind) {
    const pieces = [];
    let cur = x0;
    (gaps || []).slice().sort((p, q) => p.a - q.a).forEach(g => { if (g.a > cur) pieces.push([cur, g.a]); cur = Math.max(cur, g.b); });
    if (x1 > cur) pieces.push([cur, x1]);
    pieces.forEach(([a, b]) => { if (b - a > 0.05) lay.rects.push(rect((a + b) / 2, d, (b - a) / 2, 0.15, kind || 'wall')); });
  }

  function pickExitX(lay, rng, opts) {
    const W = lay.W;
    const lim = W / 2 - 1.2 - 0.3 - 2.3; // keep room for keypad next to door
    const cands = (opts || [-2.6, 0, 2.6]).filter(x => Math.abs(x) <= Math.max(0, lim));
    lay.exitX = cands.length ? rng.pick(cands) : 0;
  }

  function addWallDecor(lay, rng) {
    // sconces / paintings on side walls, avoiding wall-mounted furniture and partitions touching walls
    const blocked = [];
    lay.closets.forEach(c => blocked.push({ side: c.side, a: c.d - 1.4, b: c.d + 1.4 }));
    lay.drawers.forEach(c => blocked.push({ side: c.side, a: c.d - 1.1, b: c.d + 1.1 }));
    lay.rects.forEach(r => {
      const touchesL = r.x - r.hw < -lay.W / 2 + 0.4, touchesR = r.x + r.hw > lay.W / 2 - 0.4;
      if (touchesL) blocked.push({ side: -1, a: r.d - r.hd - 0.5, b: r.d + r.hd + 0.5 });
      if (touchesR) blocked.push({ side: 1, a: r.d - r.hd - 0.5, b: r.d + r.hd + 0.5 });
    });
    lay.props.forEach(p => {
      if (Math.abs(p.x) > lay.W / 2 - 1.6) blocked.push({ side: Math.sign(p.x), a: p.d - 1.2, b: p.d + 1.2 });
    });
    for (const side of [-1, 1]) {
      const n = Math.max(1, Math.floor(lay.frontD / 7));
      for (let i = 0; i < n; i++) {
        const d = lay.frontD * (i + 0.5) / n + rng.range(-0.8, 0.8);
        if (d < 1.5 || d > lay.frontD - 1.5) continue;
        if (blocked.some(b => b.side === side && d > b.a && d < b.b)) continue;
        lay.wallDecor.push({ type: (i + (side > 0 ? 1 : 0)) % 2 ? 'sconce' : 'painting', side, d });
      }
    }
  }

  // Archetype builders ---------------------------------------------------------
  const BUILD = {};

  BUILD.guest = function (lay, rng) {
    const s = rng.sign();
    placeCloset(lay, s, [0.45, 0.5, 0.38, 0.58].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.3, 0.36, 0.25].map(f => f * lay.L), 'random');
    placeDrawer(lay, s, [0.74, 0.8, 0.68].map(f => f * lay.L), 'random');
    // a bed-like block against the wall (real obstacle)
    placeRectProp(lay, 'bed', -s * (lay.W / 2 - 1.25), lay.L * rng.range(0.6, 0.72), 1.1, 1.25, { side: -s });
    placeProp(lay, 'sideTable', s * (lay.W / 2 - 1.7), lay.L * 0.25, 0.62);
  };
  BUILD.darkRoom = function (lay, rng) {
    const s = rng.sign();
    placeCloset(lay, s, [0.42, 0.5, 0.35].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.32, 0.4, 0.26].map(f => f * lay.L), 'battery');
    placeDrawer(lay, -s, [0.74, 0.8].map(f => f * lay.L), 'random');
    const cx = rng.range(1.2, 2.2) * rng.sign();
    const crate = rect(cx, lay.L * rng.range(0.55, 0.68), 0.88, 0.88, 'crate', { y1: 1.75 });
    if (fitsFree(lay, { shape: 'rect', o: crate }, 0.4)) lay.rects.push(crate);
    placeProp(lay, 'lamp', s * (lay.W / 2 - 1.3), lay.L * 0.7, 0.4);
  };
  BUILD.storage = function (lay, rng) {
    const s = rng.sign();
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? -s : s;
      const c = rect(side * rng.range(1.3, 2.6), lay.L * (0.3 + i * 0.22 + rng.range(-0.03, 0.03)), 0.88, 0.88, 'crate', { y1: 1.75 });
      if (fitsFree(lay, { shape: 'rect', o: c }, 0.5)) lay.rects.push(c);
    }
    placeCloset(lay, s, [0.5, 0.42, 0.6, 0.35].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.3, 0.45, 0.62].map(f => f * lay.L), 'random');
    placeRectProp(lay, 'crateStack', -s * (lay.W / 2 - 1.05), lay.L * 0.82, 0.88, 0.88);
  };
  BUILD.grandHall = function (lay, rng) {
    const hw = rng.range(1.9, 2.4), hd = rng.range(2.1, 2.7);
    const pd = lay.L * rng.range(0.47, 0.53);
    lay.rects.push(rect(0, pd, hw, hd, 'podium', { y1: 1.15 }));
    const px = hw + 2.7;
    [[-px, pd - hd - 1.4], [px, pd - hd - 1.4], [-px, pd + hd + 1.4], [px, pd + hd + 1.4]].forEach(([x, d]) => {
      const c = circle(x, d, 0.62, 'pillar');
      if (fitsFree(lay, { shape: 'circle', o: c }, 0.5)) lay.circles.push(c);
    });
    const s = rng.sign();
    placeCloset(lay, s, [0.28, 0.35, 0.22, 0.42].map(f => f * lay.L));
    placeCloset(lay, -s, [0.75, 0.68, 0.8, 0.6].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.3, 0.22, 0.4].map(f => f * lay.L), 'random');
    placeRectProp(lay, 'clock', s * (lay.W / 2 - 0.55), lay.L * 0.82, 0.42, 0.32, { side: s });
  };
  BUILD.lCorridor = function (lay, rng) {
    // ㄱ-shape: lengthwise partition makes a dead-end bay and a side corridor leading to the exit
    const s = rng.sign();
    const px = s * 1.0;
    const d0 = lay.L * rng.range(0.34, 0.42);
    wallSegmentsZ(lay, px, d0, lay.frontD, [], 'partition');
    lay.exitX = s * 4.0;
    // bay side (-s) gets closet + drawers (exploration reward)
    placeCloset(lay, -s, [0.62, 0.7, 0.55].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.86, 0.9, 0.45].map(f => f * lay.L), 'random');
    placeDrawer(lay, s, [0.2, 0.15].map(f => f * lay.L), 'random');
    placeCloset(lay, s, [0.62, 0.55, 0.7].map(f => f * lay.L));
    lay.notes.push('ㄱ자: 앞쪽은 막힌 곁방, 옆 통로로 돌아 출구');
  };
  BUILD.uCorridor = function (lay, rng) {
    // ㄷ / S-shape: two cross partitions with gaps on opposite sides
    const s = rng.sign();
    const W = lay.W;
    const gap = 2.8;
    const dA = lay.L * 0.33, dB = lay.L * 0.66;
    if (s > 0) {
      wallSegmentsX(lay, dA, -W / 2, W / 2, [{ a: W / 2 - gap, b: W / 2 }], 'partition');
      wallSegmentsX(lay, dB, -W / 2, W / 2, [{ a: -W / 2, b: -W / 2 + gap }], 'partition');
    } else {
      wallSegmentsX(lay, dA, -W / 2, W / 2, [{ a: -W / 2, b: -W / 2 + gap }], 'partition');
      wallSegmentsX(lay, dB, -W / 2, W / 2, [{ a: W / 2 - gap, b: W / 2 }], 'partition');
    }
    lay.exitX = 0;
    placeCloset(lay, -s, [0.5, 0.45, 0.55].map(f => f * lay.L));
    placeCloset(lay, s, [0.84, 0.8, 0.88].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.16, 0.2].map(f => f * lay.L), 'random');
    placeDrawer(lay, s, [0.5, 0.45].map(f => f * lay.L), 'random');
    lay.notes.push('ㄷ자: 칸막이 두 개로 지그재그 동선');
  };
  // 🧭 미로 객실층: 3×3 작은 방들이 문틀 통로로 연결된 구조 (V5.2)
  //  - 무작위 신장 트리(막다른 방 생김) + 고리 1개(되돌아가기 쉬움) → 길을 잃어도 금방 다시 찾음
  //  - 연결되지 않은 벽 일부에는 '잠긴 문'(열리지 않음)을 달아 "이 문은 막혀 있네" 경험
  //  - 출구는 주로 왼쪽/오른쪽 끝 방 → 옆방을 거쳐야 탈출
  //  - lay.maze.signs: 정답 경로 위 통로 (게임에서 난이도에 따라 '출구' 표지판으로 표시)
  function buildMaze(lay, rng, opts) {
    opts = opts || {};
    const W = lay.W, L = lay.L, C = 3, Rn = 3, cw = W / C, cl = L / Rn;
    const id = (c, r) => r * C + c;
    const edges = new Map();               // key "a-b" (a<b) → {open}
    const ek = (a, b) => a < b ? a + '-' + b : b + '-' + a;
    const nb = (c, r) => [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].filter(([x, y]) => x >= 0 && x < C && y >= 0 && y < Rn);
    for (let r = 0; r < Rn; r++) for (let c = 0; c < C; c++) nb(c, r).forEach(([x, y]) => edges.set(ek(id(c, r), id(x, y)), { open: false }));
    // DFS 신장 트리 (입구 = 아래 가운데 방)
    const seen = new Set([id(1, 0)]), stack = [[1, 0]];
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const opts2 = rng.shuffle(nb(c, r).filter(([x, y]) => !seen.has(id(x, y))));
      if (!opts2.length) { stack.pop(); continue; }
      const [x, y] = opts2[0];
      edges.get(ek(id(c, r), id(x, y))).open = true;
      seen.add(id(x, y)); stack.push([x, y]);
    }
    // 고리 1개 추가 (학생이 너무 헤매지 않게)
    const closed = [...edges.entries()].filter(([, e]) => !e.open);
    if (closed.length) rng.pick(closed)[1].open = true;
    // 출구 방: 80% 왼쪽/오른쪽 위 방
    const exC = rng.chance(0.8) ? rng.pick([0, 2]) : 1;
    lay.exitX = exC === 1 ? 0 : (exC - 1) * Math.min(cw, W / 2 - 3.9);
    // 벽 만들기
    const openings = [], fakeDoors = [];
    const closedList = [];
    for (const [key, e] of edges) {
      const [a, b] = key.split('-').map(Number);
      const ca = a % C, ra = Math.floor(a / C), cb = b % C, rb = Math.floor(b / C);
      const gapW = 2.4;
      if (ra === rb) {                      // 좌우 이웃 → 세로 벽 (x 고정)
        const x = -W / 2 + Math.max(ca, cb) * cw, d0 = ra * cl, d1 = (ra + 1) * cl;
        const gc = rng.range(d0 + 0.9 + gapW / 2, d1 - 0.9 - gapW / 2);
        wallSegmentsZ(lay, x, d0, d1, e.open ? [{ a: gc - gapW / 2, b: gc + gapW / 2 }] : [], 'partition');
        if (e.open) openings.push({ x, d: gc, axis: 'z', w: gapW, cells: [a, b] });
        else closedList.push({ x, d: (d0 + d1) / 2, axis: 'z' });
      } else {                               // 앞뒤 이웃 → 가로 벽 (d 고정)
        const d = Math.max(ra, rb) * cl, x0 = -W / 2 + ca * cw, x1 = x0 + cw;
        const gc = rng.range(x0 + 0.9 + gapW / 2, x1 - 0.9 - gapW / 2);
        wallSegmentsX(lay, d, x0, x1, e.open ? [{ a: gc - gapW / 2, b: gc + gapW / 2 }] : [], 'partition');
        if (e.open) openings.push({ x: gc, d, axis: 'x', w: gapW, cells: [a, b] });
        else closedList.push({ x: (x0 + x1) / 2, d, axis: 'x' });
      }
    }
    rng.shuffle(closedList).slice(0, 2).forEach(f => fakeDoors.push(f));
    // 입구 → 출구 최단 경로 (방 단위 BFS)
    const start = id(1, 0), goal = id(exC, 2), prev = new Map([[start, -1]]), q = [start];
    while (q.length) { const cur = q.shift(); if (cur === goal) break;
      for (const [key, e] of edges) { if (!e.open) continue; const [a, b] = key.split('-').map(Number); const nx = a === cur ? b : (b === cur ? a : -1); if (nx < 0 || prev.has(nx)) continue; prev.set(nx, cur); q.push(nx); } }
    const pathCells = []; for (let v = goal; v !== -1 && v !== undefined; v = prev.get(v)) pathCells.unshift(v);
    const signs = [];
    for (let i = 0; i + 1 < pathCells.length; i++) {
      const a = pathCells[i], b = pathCells[i + 1];
      const op = openings.find(o => (o.cells[0] === a && o.cells[1] === b) || (o.cells[0] === b && o.cells[1] === a));
      if (!op) continue;
      // 표지판은 '지금 있는 방(a)' 쪽 벽면에 붙인다
      const ac = a % C, ar = Math.floor(a / C);
      const acx = -W / 2 + (ac + 0.5) * cw, acd = (ar + 0.5) * cl;
      signs.push({ x: op.x, d: op.d, axis: op.axis, w: op.w, face: op.axis === 'z' ? Math.sign(acx - op.x) : Math.sign(acd - op.d) });
    }
    lay.maze = { cols: C, rows: Rn, cw, cl, openings, fakeDoors, signs, exitCell: [exC, 2], pathLen: pathCells.length };
    // 가구: 바깥 왼쪽·오른쪽 벽의 각 줄에 옷장(숨을 곳), 서랍, 가운데 방엔 소품
    for (let r = 0; r < Rn; r++) {
      const dm = (r + 0.5) * cl;
      const order = rng.chance(0.5) ? [1, -1] : [-1, 1];
      placeCloset(lay, order[0], [dm, dm - 1.2, dm + 1.2]);
      if (r !== 1 || rng.chance(0.5)) placeCloset(lay, order[1], [dm + 1.0, dm - 1.0, dm]);
      if (!opts.noRandomDrawers) placeDrawer(lay, order[1], [dm - 2.2, dm + 2.2, dm - 1.8], 'random');
    }
    placeProp(lay, 'sideTable', rng.range(-1.6, 1.6), cl * 1.5 + rng.range(-1, 1), 0.62);
    placeProp(lay, 'lamp', rng.range(-2, 2), cl * 2.5 + rng.range(-1.2, 0.2), 0.4);
    lay.notes.push('미로: 3×3 방, 막다른 방·잠긴 문, 출구는 ' + ['왼쪽', '가운데', '오른쪽'][exC] + ' 끝 방');
  }
  BUILD.maze = function (lay, rng) { buildMaze(lay, rng); };
  BUILD.zigzag = function (lay, rng) {
    // 〰️ 칸막이 3개가 좌우 번갈아 열려 있어 S자로 세 번 꺾어 가는 복도
    const s = rng.sign(), W = lay.W, L = lay.L, gap = 2.9;
    const ds = [0.24, 0.48, 0.72].map(f => L * (f + rng.range(-0.015, 0.015)));
    ds.forEach((d, i) => {
      const side = (i % 2 === 0) ? s : -s;            // 이 칸막이의 열린 쪽
      wallSegmentsX(lay, d, -W / 2, W / 2, [side > 0 ? { a: W / 2 - gap, b: W / 2 } : { a: -W / 2, b: -W / 2 + gap }], 'partition');
    });
    lay.exitX = 0;
    const lanes = [[0, ds[0]], [ds[0], ds[1]], [ds[1], ds[2]], [ds[2], L]];
    const mid = k => (lanes[k][0] + lanes[k][1]) / 2;
    // 칸(레인)마다 옷장 1개 → 어느 칸에서 러쉬 경고가 들려도 가까운 곳에 숨을 수 있음
    placeCloset(lay, -s, [mid(0), mid(0) + 0.5, mid(0) - 0.5]);
    placeCloset(lay, -s, [mid(1), mid(1) - 0.6, mid(1) + 0.6]) || placeCloset(lay, s, [mid(1), mid(1) - 0.6]);
    placeCloset(lay, s, [mid(2), mid(2) - 0.6, mid(2) + 0.6]) || placeCloset(lay, -s, [mid(2), mid(2) + 0.6]);
    placeCloset(lay, -s, [mid(3) - 0.8, mid(3), mid(3) + 0.8]);
    placeDrawer(lay, s, [mid(0), mid(0) - 0.6], 'random');
    placeDrawer(lay, s, [mid(3) - 0.5, mid(3) + 0.5], 'random');
    // 막힌 모서리마다 작은 소품 (그냥 빈 벽이 아니라 공간이 되게)
    placeProp(lay, 'lamp', s * (W / 2 - 1.1), mid(1), 0.4);
    placeProp(lay, 'sideTable', -s * (W / 2 - 1.5), mid(2), 0.62);
    const crate = rect(rng.range(-1.2, 1.2), mid(2) + rng.range(-0.4, 0.4), 0.7, 0.7, 'crate', { y1: 1.4 });
    if (rng.chance(0.6) && fitsFree(lay, { shape: 'rect', o: crate }, 0.6)) lay.rects.push(crate);
    lay.notes.push('지그재그: 칸막이 3개를 S자로 세 번 꺾어 통과');
  };
  BUILD.slalom = function (lay, rng) {
    // 🧱 양쪽 벽에서 번갈아 튀어나온 벽 4개 사이를 이리저리 돌아가는 홀
    const s = rng.sign(), W = lay.W, L = lay.L;
    const reach = W * rng.range(0.58, 0.64);
    const ds = [0.2, 0.38, 0.56, 0.74].map(f => L * f);
    ds.forEach((d, i) => {
      const from = (i % 2 === 0) ? s : -s;              // 벽이 붙어 있는 쪽
      const x0 = from > 0 ? W / 2 - reach : -W / 2, x1 = from > 0 ? W / 2 : -W / 2 + reach;
      wallSegmentsX(lay, d, x0, x1, [], 'partition');
    });
    lay.exitX = 0;
    const between = k => (ds[k] + ds[k + 1]) / 2;
    // 벽이 붙은 쪽 구석(막힌 곳)에 옷장 → 숨으러 들어가는 공간
    placeCloset(lay, s, [between(0), between(0) + 0.5, between(0) - 0.5]);
    placeCloset(lay, -s, [between(1), between(1) + 0.5]);
    placeCloset(lay, s, [between(2), between(2) - 0.5, (ds[3] + L) / 2]);
    placeDrawer(lay, -s, [ds[0] / 2, ds[0] / 2 + 0.6], 'random');
    placeDrawer(lay, -s, [(ds[3] + L) / 2, (ds[3] + L) / 2 + 0.6], 'random');
    placeProp(lay, 'lamp', -s * (W / 2 - 1.1), between(0), 0.4);
    placeProp(lay, 'sideTable', s * (W / 2 - 1.5), between(1), 0.62);
    lay.notes.push('엇갈린 벽: 양쪽에서 번갈아 나온 벽 4개를 돌아가며 통과');
  };
  BUILD.shortcutHall = function (lay, rng) {
    // cross partition: a low crawl hole (shortcut, crouch) in the middle + an open detour at one side
    const s = rng.sign();
    const W = lay.W;
    const dP = lay.L * rng.range(0.48, 0.55);
    const detour = s > 0 ? { a: W / 2 - 2.7, b: W / 2 } : { a: -W / 2, b: -W / 2 + 2.7 };
    const crawl = { a: -1.0, b: 1.0 };
    wallSegmentsX(lay, dP, -W / 2, W / 2, [detour, crawl], 'partition');
    lay.rects.push(rect(0, dP, 1.0, 0.15, 'lowWall', { y0: 1.25, y1: ROOM_H, crouch: true }));
    placeCloset(lay, -s, [0.3, 0.25, 0.36].map(f => f * lay.L));
    placeCloset(lay, s, [0.78, 0.72, 0.84].map(f => f * lay.L));
    placeDrawer(lay, s, [0.28, 0.2].map(f => f * lay.L), 'random');
    placeDrawer(lay, -s, [0.75, 0.82].map(f => f * lay.L), 'random');
    lay.notes.push('가운데 낮은 구멍은 웅크려 지나는 지름길, 옆은 우회로');
  };
  BUILD.secretWing = function (lay, rng) {
    const s = rng.sign();
    const W = lay.W;
    const ix = s * (W / 2 - 3.4);
    const d0 = lay.L * 0.28, d1 = lay.L * 0.72;
    const gA = d1 - 2.1, gB = d1 - 0.85;
    wallSegmentsZ(lay, ix, d0, d1, [{ a: gA, b: gB }], 'partition');
    const xa = Math.min(ix, s * W / 2), xb = Math.max(ix, s * W / 2);
    wallSegmentsX(lay, d0, xa, xb, [], 'partition');
    wallSegmentsX(lay, d1, xa, xb, [], 'partition');
    lay.secret = { x: (ix + s * W / 2) / 2, d: (d0 + d1) / 2, side: s, gap: { x: ix, d: (gA + gB) / 2 } };
    placeDrawer(lay, s, [(d0 + d1) / 2 - 0.6, (d0 + d1) / 2, d0 + 1.4].map(v => v), 'secret');
    placeCloset(lay, -s, [0.48, 0.42, 0.55].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.22, 0.8].map(f => f * lay.L), 'random');
    lay.notes.push('좁은 틈으로 들어가는 비밀방');
  };
  BUILD.keySearch = function (lay, rng) {
    if (rng.chance(0.65)) {
      // 미로형 열쇠 찾기: 여러 방 서랍 중 하나에 열쇠 (입구에서 먼 방 우선)
      buildMaze(lay, rng, { noRandomDrawers: true });
      for (let r = 0; r < 3; r++) placeDrawer(lay, rng.sign(), [(r + 0.5) * lay.maze.cl - 2.0, (r + 0.5) * lay.maze.cl + 2.0, (r + 0.5) * lay.maze.cl], 'random');
      lay.requiresKey = true;
      const far = lay.drawers.map((dr, i) => ({ i, d: dr.d })).sort((a, b) => b.d - a.d);
      lay.keyDrawer = far.length ? (far.length > 1 && rng.chance(0.5) ? far[1].i : far[0].i) : -1;
      if (lay.keyDrawer >= 0) lay.drawers[lay.keyDrawer].loot = 'key';
      lay.notes.push('미로형 열쇠 탐색');
      return;
    }
    const s = rng.sign();
    const W = lay.W;
    const ix = s * (W / 2 - 3.8);
    const d0 = lay.L * 0.2, d1 = lay.L * 0.62;
    const mid = (d0 + d1) / 2;
    wallSegmentsZ(lay, ix, d0, d1, [{ a: mid - 1.2, b: mid + 1.2 }], 'partition');
    const xa = Math.min(ix, s * W / 2), xb = Math.max(ix, s * W / 2);
    wallSegmentsX(lay, d0, xa, xb, [], 'partition');
    wallSegmentsX(lay, d1, xa, xb, [], 'partition');
    lay.secret = { x: (ix + s * W / 2) / 2, d: mid, side: s, sideRoom: true };
    placeDrawer(lay, s, [d0 + 1.4, d0 + 1.8], 'random');
    placeDrawer(lay, s, [d1 - 1.4, d1 - 1.8], 'random');
    placeDrawer(lay, -s, [0.72 * lay.L, 0.8 * lay.L, 0.3 * lay.L], 'random');
    placeCloset(lay, -s, [0.42 * lay.L, 0.5 * lay.L, 0.35 * lay.L]);
    lay.requiresKey = true;
    const candidates = lay.drawers.map((_, i) => i);
    lay.keyDrawer = candidates.length ? rng.pick(candidates) : -1;
    if (lay.keyDrawer >= 0) lay.drawers[lay.keyDrawer].loot = 'key';
    lay.notes.push('곁방 서랍 중 하나에 열쇠');
  };
  BUILD.dupe = function (lay, rng) {
    const W = lay.W;
    lay.frontD = lay.L - 0.9;
    const xs = [-4.0, 0, 4.0];
    const correct = rng.int(0, 2);
    lay.dupeDoors = xs.map((x, i) => ({ x, correct: i === correct }));
    lay.exitX = xs[correct];
    // niche side blocks between doors (from frontD to L, solid)
    const hd = (lay.L - lay.frontD) / 2, dc = (lay.frontD + lay.L) / 2;
    const edges = [-W / 2, -5.15, -2.85, -1.15, 1.15, 2.85, 5.15, W / 2];
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i], b = edges[i + 1];
      lay.rects.push(rect((a + b) / 2, dc, (b - a) / 2, hd, 'niche'));
    }
    xs.forEach((x, i) => { if (i !== correct) lay.rects.push(rect(x, lay.L - 0.12, 1.15, 0.12, 'nicheBack')); });
    const s = rng.sign();
    placeCloset(lay, s, [0.42, 0.5, 0.35].map(f => f * lay.L));
    placeDrawer(lay, -s, [0.3, 0.38].map(f => f * lay.L), 'random');
  };
  BUILD.bridge = function (lay, rng) {
    const d0 = rng.range(6.8, 7.6), len = 5.8;
    const d1 = d0 + len;
    lay.chasm = { d0, d1, bridgeX: 0, half: 1.05, deckHalf: 1.7 };
    const W = lay.W;
    lay.rects.push(rect(0, (d0 + d1) / 2, W / 2, len / 2, 'chasm', { off: 'bridged' }));
    const sideW = (W / 2 - 1.05);
    lay.rects.push(rect(-(1.05 + sideW / 2), (d0 + d1) / 2, sideW / 2, len / 2, 'chasmSide', { on: 'bridged' }));
    lay.rects.push(rect((1.05 + sideW / 2), (d0 + d1) / 2, sideW / 2, len / 2, 'chasmSide', { on: 'bridged' }));
    lay.exitX = 0;
    const s = rng.sign();
    lay.terminal = { mode: 'stand', x: s * 1.6, d: d0 - 0.85, access: { x: s * 1.6, d: d0 - 1.85 }, foot: circle(s * 1.6, d0 - 0.85, 0.5, 'terminal') };
    placeProp(lay, 'lamp', -s * (W / 2 - 1.2), d1 + 2.5, 0.4);
  };
  BUILD.seek = function (lay, rng) {
    const W = lay.W, L = lay.L;
    const s = rng.sign();
    const blockW = 4.0;
    const block = (side, d) => lay.rects.push(rect(side * (W / 2 - WALL_T - blockW / 2), d, blockW / 2, 0.5, 'debris', { y1: 2.3 }));
    block(s, L * 0.14);
    lay.rects.push(rect(0, L * 0.25, W / 2, 0.42, 'beam', { y0: 1.32, y1: 2.15, crouch: true }));
    block(-s, L * 0.36);
    // gate with two doors: one lit (correct) and one dark (locked)
    const gd = L * 0.5;
    const gx = 2.25;
    const correctSide = rng.sign();
    wallSegmentsX(lay, gd, -W / 2, W / 2, [{ a: -gx - 0.95, b: -gx + 0.95 }, { a: gx - 0.95, b: gx + 0.95 }], 'gateWall');
    lay.gate = { d: gd, correctX: correctSide * gx, wrongX: -correctSide * gx, half: 0.95 };
    lay.rects.push(rect(-correctSide * gx, gd, 0.95, 0.12, 'gateDoorWrong'));
    lay.rects.push(rect(correctSide * gx, gd, 0.95, 0.12, 'gateDoor', { off: 'gateOpen' }));
    block(s, L * 0.63);
    lay.rects.push(rect(0, L * 0.74, W / 2, 0.42, 'beam', { y0: 1.32, y1: 2.15, crouch: true }));
    block(-s, L * 0.86);
    // V6.3: 복도가 길어진 만큼 장애물 하나씩 더 (관문 앞뒤)
    block(-s, L * 0.44);
    block(s, L * 0.56);
    lay.exitX = 0;
    lay.accent = { x: 0, d: L - 1.5, color: 0x9fd8ff, intensity: 2.2, range: 13 };
  };
  BUILD.library = function (lay, rng) {
    const W = lay.W, L = lay.L;
    const shelf = (x, d) => lay.rects.push(rect(x, d, 1.48, 0.58, 'shelf', { y1: 3.75 }));
    const rowA = L * 0.3, rowB = L * 0.53, rowC = L * 0.76;
    const off = rng.range(-0.5, 0.5);
    shelf(-5.3, rowA); shelf(0 + off, rowA); shelf(5.3, rowA);
    shelf(-4.0, rowB); shelf(4.0, rowB);
    lay.circles.push(circle(0, rowB, 0.85, 'readingTable'));
    shelf(-5.3, rowC); shelf(0 - off, rowC); shelf(5.3, rowC);
    const s = rng.sign();
    placeCloset(lay, s, [L * 0.42, L * 0.4, L * 0.45]);
    placeCloset(lay, -s, [L * 0.65, L * 0.64, L * 0.67]);
    placeDrawer(lay, -s, [L * 0.16, L * 0.2], 'random');
    placeDrawer(lay, s, [L * 0.9, L * 0.88], 'random');
    // creaky floor boards in the aisles (loud even when crouching)
    // 입구 앞 통로(피할 수 없는 곳)에는 두지 않는다
    const aisle = [(rowA + rowB) / 2, (rowB + rowC) / 2, (rowC + L) / 2];
    for (let i = 0; i < 5; i++) {
      const d = aisle[i % aisle.length] + rng.range(-0.5, 0.5);
      const x = rng.range(-6.5, 6.5);
      lay.creaks.push(rect(x, d, 0.75, 0.55, 'creak'));
    }
    lay.figure = {
      start: { x: 0, d: (rowB + rowC) / 2 },
      waypoints: [
        { x: -2.6, d: (rowA + rowB) / 2 }, { x: 2.6, d: (rowA + rowB) / 2 }, { x: 7.4, d: rowB },
        { x: 2.6, d: (rowB + rowC) / 2 }, { x: -2.6, d: (rowB + rowC) / 2 }, { x: -7.4, d: rowB }
      ]
    };
  };

  const DIMS = {
    guest: [12.5, 13.5, 18, 21], darkRoom: [13.5, 14.5, 20, 22], storage: [13, 14, 20, 22], grandHall: [16.5, 17.5, 22, 24],
    lCorridor: [14, 14.5, 20, 22], uCorridor: [14, 14.5, 21, 23], zigzag: [13.5, 14.5, 24, 27], slalom: [13, 14, 22, 25], maze: [20.5, 22, 20.5, 22.5], shortcutHall: [15, 15.5, 20, 22], secretWing: [15.5, 16, 20, 22],
    keySearch: [20.5, 22, 21, 23], dupe: [16, 16, 21, 22], bridge: [13, 13.5, 24, 25], seek: [9.5, 9.5, 56, 56], library: [18, 18, 28, 28]
  };

  function buildLayout(door, arch, seed, puzzle, attempt, safe, events) {
    const rng = SEASON > 1 ? makeRng('room', seed, door, arch, attempt, sKey()) : makeRng('room', seed, door, arch, attempt);
    const dm = DIMS[arch] || DIMS.guest;
    const W = Math.round(rng.range(dm[0], dm[1]) * 10) / 10;
    const L = Math.round(rng.range(dm[2], dm[3]) * 10) / 10;
    const lay = newLayout(door, arch, W, L, rng);
    if (!['dupe', 'lCorridor', 'uCorridor', 'zigzag', 'slalom', 'maze', 'seek', 'bridge'].includes(arch)) pickExitX(lay, rng);
    if (safe) {
      // guaranteed simple variant: only wall furniture
      if (arch === 'dupe') BUILD.dupe(lay, rng);
      else if (arch === 'bridge') BUILD.bridge(lay, rng);
      else if (arch === 'seek') BUILD.seek(lay, rng);
      else if (arch === 'library') BUILD.library(lay, rng);
      else {
        lay.exitX = 0;
        placeCloset(lay, 1, [lay.L * 0.3]);
        placeCloset(lay, -1, [lay.L * 0.72]);
        placeDrawer(lay, -1, [lay.L * 0.3], arch === 'keySearch' ? 'key' : 'random');
        if (arch === 'keySearch') { lay.requiresKey = true; lay.keyDrawer = 0; }
      }
      lay.safeFallback = true;
    } else {
      (BUILD[arch] || BUILD.guest)(lay, rng);
    }
    // rush / ambush rooms: a closet in each half of the room so hiding is always fair
    if (events && (events.rush || events.ambush) && !lay.chasm) {
      const near = lay.closets.some(c => c.d < lay.L * 0.5), far = lay.closets.some(c => c.d >= lay.L * 0.5);
      const fr = [0.25, 0.3, 0.2, 0.35, 0.4], br = [0.72, 0.78, 0.66, 0.84, 0.6];
      if (!near) placeCloset(lay, 1, fr.map(f => f * lay.L)) || placeCloset(lay, -1, fr.map(f => f * lay.L));
      if (!far) placeCloset(lay, -1, br.map(f => f * lay.L)) || placeCloset(lay, 1, br.map(f => f * lay.L));
    }
    // puzzle hardware
    const p = puzzle || { kind: 'any', device: null };
    lay.puzzleKind = p.kind;
    if (p.kind === 'bridge' || arch === 'bridge') {
      lay.device = { type: 'bridge' };
    } else if (p.kind === 'dupe') {
      placeTerminal(lay, 'stand', standCandidates(lay));
    } else if (p.kind === 'none') {
      lay.terminal = null;
    } else {
      const wantStand = p.kind === 'terminal' || ['voxel', 'sorter', 'monolith'].includes(p.device) || rng.chance(0.4);
      if (p.kind === 'door' || !wantStand) placeTerminal(lay, 'keypad');
      if (!lay.terminal) placeTerminal(lay, 'stand', standCandidates(lay));
      if (!lay.terminal) placeTerminal(lay, 'keypad');
      if (p.device === 'monolith') addMonolith(lay);
      else if (p.device === 'voxel') addPad(lay, 'voxel', 1.0, 1.0);
      else if (p.device === 'sorter') addPad(lay, 'sorter', 1.8, 0.5);
      else if (p.device === 'gear') lay.device = { type: 'gear', x: lay.exitX, d: lay.frontD };
    }
    addWallDecor(lay, rng);
    applySeasonItems(lay, rng);
    return lay;
  }
  // 시즌별 진행 아이템: 열쇠 방은 시즌 수만큼 아이템, 시즌2·3 미로는 일부가 아이템 1~2개를 요구
  function applySeasonItems(lay, rng) {
    lay.season = SEASON;
    lay.keysNeeded = lay.requiresKey ? 1 : 0;
    if (SEASON === 1 || lay.chasm || lay.safeFallback) return;
    let need = 0;
    if (lay.requiresKey) need = SEASON;                                   // 퓨즈 2 / 룬 조각 3
    else if (lay.maze && rng.chance(SEASON === 3 ? 0.7 : 0.5)) need = SEASON === 3 ? 2 : 1;
    if (!need) return;
    // 아이템 수만큼 서랍이 없으면 벽에 서랍을 더 놓는다
    for (let t = 0; t < 12 && lay.drawers.length < need + (lay.maze ? 0 : 1); t++) {
      const side = t % 2 ? 1 : -1, f = [0.3, 0.55, 0.8, 0.42, 0.68, 0.22][t % 6];
      placeDrawer(lay, side, [f * lay.L, f * lay.L + 1.2, f * lay.L - 1.2], 'random');
    }
    const idx = lay.drawers.map((dr, i) => ({ i, d: dr.d })).sort((a, b) => b.d - a.d).map(o => o.i);
    if (idx.length < need) { lay.itemShortage = true; need = idx.length; }
    if (!need) return;
    // 이미 정해진 열쇠 서랍 + 입구에서 먼 서랍부터
    const chosen = [];
    if (lay.keyDrawer >= 0) chosen.push(lay.keyDrawer);
    for (const i of idx) { if (chosen.length >= need) break; if (!chosen.includes(i)) chosen.push(i); }
    chosen.forEach(i => { lay.drawers[i].loot = 'key'; });
    lay.requiresKey = true;
    lay.keyDrawer = chosen[0];
    lay.keyDrawers = chosen;
    lay.keysNeeded = chosen.length;
  }
  function standCandidates(lay) {
    const L = lay.frontD;
    // 도서관: 단말기는 순찰 구역 너머 안쪽 끝 → 피규어를 피해 몰래 지나가야 함
    if (lay.arch === 'library') return [2.4, -2.4, 0, 3.6, -3.6].flatMap(x => [0.9, 0.87, 0.93].map(f => ({ x, d: L * f })));
    const xs = [0, 1.6, -1.6, 3.0, -3.0, 4.2, -4.2];
    const out = [];
    [0.56, 0.62, 0.5, 0.7, 0.44, 0.78, 0.38].forEach(f => xs.forEach(x => out.push({ x, d: L * f })));
    if (lay.secret && !lay.secret.sideRoom) return out.filter(c => Math.abs(c.x - lay.secret.x) > 2.2 || c.d < lay.L * 0.25 || c.d > lay.L * 0.75);
    if (lay.secret && lay.secret.sideRoom) return out.filter(c => Math.sign(c.x) !== lay.secret.side || Math.abs(c.x) < lay.W / 2 - 4.4);
    return out;
  }
  function addMonolith(lay) {
    const md = lay.frontD - 1.75;
    const mono = rect(lay.exitX, md, 1.4, 0.55, 'monolith', { off: 'deviceDone', y1: 3.8 });
    for (const dir of [1, -1]) {
      const tx = lay.exitX + dir * 3.4;
      const moved = rect(tx, md, 1.4, 0.55, 'monolithMoved', { on: 'deviceDone', y1: 3.8 });
      if (Math.abs(tx) + 1.4 > lay.W / 2 - 0.2) continue;
      const clash = footprints(lay).some(f => fpOverlap({ shape: 'rect', o: moved }, f, 0.15));
      if (clash) continue;
      if (lay.terminal && lay.terminal.mode === 'keypad' && Math.abs(lay.terminal.x - tx) < 1.9) continue;
      lay.rects.push(mono, moved);
      lay.device = { type: 'monolith', x: lay.exitX, d: md, toX: tx };
      return;
    }
    lay.device = { type: 'gear', x: lay.exitX, d: lay.frontD };
  }
  function addPad(lay, type, hw, hd) {
    const t = lay.terminal;
    const cands = [];
    if (t && t.mode === 'stand') { [2.4, -2.4, 3.2, -3.2].forEach(dx => cands.push({ x: t.x + dx, d: t.d })); }
    [0, 2.5, -2.5].forEach(x => [0.6, 0.5, 0.7, 0.42].forEach(f => cands.push({ x, d: lay.frontD * f })));
    for (const c of cands) {
      const r = rect(c.x, c.d, hw, hd, type === 'voxel' ? 'voxelPad' : 'sorterPad', { y1: type === 'voxel' ? 0.45 : 0.9 });
      if (!fitsFree(lay, { shape: 'rect', o: r }, 0.45)) continue;
      lay.rects.push(r);
      lay.device = { type, x: c.x, d: c.d };
      return;
    }
    lay.device = { type: 'gear', x: lay.exitX, d: lay.frontD };
  }

  // ---------------------------------------------------------------------------
  // Collision (shared runtime + validation)
  // ---------------------------------------------------------------------------
  function pointBlocked(lay, x, d, r, st) {
    st = st || {};
    const W = lay.W;
    if (Math.abs(x) > W / 2 - WALL_T - r + 1e-6) return true;
    if (d < WALL_T + r) {
      if (!(lay.hasEntrance && Math.abs(x) < DOOR_HALF - r && d >= 0.22)) return true;
    }
    if (d > lay.frontD - WALL_T - r) {
      if (!st.exitOpen) return true;
      if (Math.abs(x - lay.exitX) > DOOR_HALF - r - 0.05) return true;
      if (d > lay.L + 0.9) return true;
    }
    for (const rc of lay.rects) {
      if (!rectActive(rc, st)) continue;
      if (rc.kind === 'creak') continue;
      if (Math.abs(x - rc.x) < rc.hw + r && Math.abs(d - rc.d) < rc.hd + r) {
        // rounded corners
        const ox = Math.abs(x - rc.x) - rc.hw, od = Math.abs(d - rc.d) - rc.hd;
        if (ox > 0 && od > 0 && Math.hypot(ox, od) >= r) continue;
        return true;
      }
    }
    for (const c of lay.circles) if (Math.hypot(x - c.x, d - c.d) < c.r + r) return true;
    const furn = [];
    lay.closets.forEach(c => furn.push(c.foot));
    lay.drawers.forEach(c => furn.push(c.foot));
    for (const f of furn) {
      if (Math.abs(x - f.x) < f.hw + r && Math.abs(d - f.d) < f.hd + r) {
        const ox = Math.abs(x - f.x) - f.hw, od = Math.abs(d - f.d) - f.hd;
        if (ox > 0 && od > 0 && Math.hypot(ox, od) >= r) continue;
        return true;
      }
    }
    for (const p of lay.props) {
      if (p.shape === 'rect') {
        const f = p.foot;
        if (Math.abs(x - f.x) < f.hw + r && Math.abs(d - f.d) < f.hd + r) return true;
      } else if (Math.hypot(x - p.foot.x, d - p.foot.d) < p.foot.r + r) return true;
    }
    if (lay.terminal && lay.terminal.foot && Math.hypot(x - lay.terminal.foot.x, d - lay.terminal.foot.d) < lay.terminal.foot.r + r) return true;
    return false;
  }

  function solidList(lay, st) {
    const out = [];
    lay.rects.forEach(rc => { if (rc.kind !== 'creak' && rectActive(rc, st)) out.push(rc); });
    lay.closets.forEach(c => out.push(c.foot));
    lay.drawers.forEach(c => out.push(c.foot));
    lay.props.forEach(p => { if (p.shape === 'rect') out.push(p.foot); });
    return out;
  }
  function circleList(lay) {
    const out = lay.circles.slice();
    lay.props.forEach(p => { if (p.shape !== 'rect') out.push(p.foot); });
    if (lay.terminal && lay.terminal.foot) out.push(lay.terminal.foot);
    return out;
  }

  // Push a circle (x,d,r) out of all obstacles and keep it inside the room shell.
  function resolvePoint(lay, x, d, r, st) {
    st = st || {};
    const rects = solidList(lay, st), circs = circleList(lay);
    const W = lay.W;
    for (let it = 0; it < 4; it++) {
      for (const rc of rects) {
        const ex = rc.hw + r, ed = rc.hd + r;
        const dx = x - rc.x, dd = d - rc.d;
        if (Math.abs(dx) < ex && Math.abs(dd) < ed) {
          const ox = Math.abs(dx) - rc.hw, od = Math.abs(dd) - rc.hd;
          if (ox > 0 && od > 0) {
            const dist = Math.hypot(ox, od);
            if (dist >= r) continue;
            const k = (r - dist) / (dist || 1e-6);
            x += Math.sign(dx) * ox * k; d += Math.sign(dd) * od * k;
          } else {
            const px = ex - Math.abs(dx), pd = ed - Math.abs(dd);
            if (px < pd) x = rc.x + Math.sign(dx || 1) * ex; else d = rc.d + Math.sign(dd || 1) * ed;
          }
        }
      }
      for (const c of circs) {
        const dx = x - c.x, dd = d - c.d, dist = Math.hypot(dx, dd);
        if (dist < c.r + r) {
          if (dist < 1e-6) { x += c.r + r; continue; }
          x = c.x + dx / dist * (c.r + r); d = c.d + dd / dist * (c.r + r);
        }
      }
      // shell
      const xl = W / 2 - WALL_T - r;
      x = Math.max(-xl, Math.min(xl, x));
      if (d < WALL_T + r) {
        if (lay.hasEntrance && Math.abs(x) < DOOR_HALF - r) d = Math.max(d, 0.25);
        else d = WALL_T + r;
      }
      if (d > lay.frontD - WALL_T - r) {
        const inDoor = st.exitOpen && Math.abs(x - lay.exitX) < DOOR_HALF - r;
        if (!inDoor) {
          // approaching an open door slightly off-centre: slide into the opening instead of sticking
          if (st.exitOpen && Math.abs(x - lay.exitX) < DOOR_HALF + 0.35 && d < lay.frontD) {
            x = lay.exitX + Math.sign(x - lay.exitX) * (DOOR_HALF - r - 0.06);
          } else d = lay.frontD - WALL_T - r;
        } else {
          x = Math.max(lay.exitX - (DOOR_HALF - r - 0.05), Math.min(lay.exitX + (DOOR_HALF - r - 0.05), x));
        }
      }
    }
    return { x, d };
  }

  // Sub-stepped move — large knockbacks cannot tunnel through thin walls.
  function moveCircle(lay, x, d, dx, dd, r, st) {
    const dist = Math.hypot(dx, dd);
    const steps = Math.max(1, Math.ceil(dist / 0.12));
    let p = { x, d };
    for (let i = 0; i < steps; i++) {
      p = resolvePoint(lay, p.x + dx / steps, p.d + dd / steps, r, st);
    }
    return p;
  }

  // ---------------------------------------------------------------------------
  // Grid search
  // ---------------------------------------------------------------------------
  function makeGrid(lay, st, r, cs) {
    cs = cs || 0.3;
    const cols = Math.ceil(lay.W / cs), rows = Math.ceil((lay.L + 0.6) / cs);
    const blocked = new Uint8Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = -lay.W / 2 + (i + 0.5) * cs, d = (j + 0.5) * cs;
      blocked[j * cols + i] = pointBlocked(lay, x, d, r, st) ? 1 : 0;
    }
    return { cols, rows, cs, blocked, W: lay.W, lay, r };
  }
  function cellOf(g, x, d) {
    const i = Math.floor((x + g.W / 2) / g.cs), j = Math.floor(d / g.cs);
    if (i < 0 || j < 0 || i >= g.cols || j >= g.rows) return -1;
    return j * g.cols + i;
  }
  function nearestFree(g, x, d, maxR) {
    let c = cellOf(g, x, d);
    if (c >= 0 && !g.blocked[c]) return c;
    const ci = Math.floor((x + g.W / 2) / g.cs), cj = Math.floor(d / g.cs);
    const R = Math.ceil((maxR || 0.6) / g.cs);
    let best = -1, bd = 1e9;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= g.cols || j >= g.rows) continue;
      const k = j * g.cols + i;
      if (g.blocked[k]) continue;
      const dist = di * di + dj * dj;
      if (dist < bd) { bd = dist; best = k; }
    }
    return best;
  }
  function bfs(g, startCell) {
    const dist = new Float32Array(g.cols * g.rows).fill(-1);
    if (startCell < 0 || g.blocked[startCell]) return dist;
    const q = new Int32Array(g.cols * g.rows);
    let h = 0, t = 0;
    q[t++] = startCell; dist[startCell] = 0;
    while (h < t) {
      const c = q[h++];
      const i = c % g.cols, j = (c / g.cols) | 0;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [di, dj] of nb) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.cols || nj >= g.rows) continue;
        const k = nj * g.cols + ni;
        if (g.blocked[k] || dist[k] >= 0) continue;
        dist[k] = dist[c] + g.cs; q[t++] = k;
      }
    }
    return dist;
  }
  // multi-source Dijkstra with 8 neighbours (true walking distance, no corner cutting)
  function multiBfs(g, cells) {
    const n = g.cols * g.rows;
    const dist = new Float32Array(n).fill(-1);
    const heap = []; // [dist, cell]
    const push = (dd, c) => { heap.push([dd, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const best = new Float32Array(n).fill(Infinity);
    cells.forEach(c => { if (c >= 0 && !g.blocked[c]) { best[c] = 0; push(0, c); } });
    while (heap.length) {
      const [dc, c] = pop();
      if (dist[c] >= 0) continue;
      dist[c] = dc;
      const i = c % g.cols, j = (c / g.cols) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.cols || nj >= g.rows) continue;
        const k = nj * g.cols + ni;
        if (g.blocked[k] || dist[k] >= 0) continue;
        if (di && dj && (g.blocked[j * g.cols + ni] || g.blocked[nj * g.cols + i])) continue;
        const nd = dc + g.cs * (di && dj ? 1.4142 : 1);
        if (nd < best[k]) { best[k] = nd; push(nd, k); }
      }
    }
    return dist;
  }
  // A* with 8-neighbours and no corner cutting; returns local points
  function findPath(g, x0, d0, x1, d1) {
    const s = nearestFree(g, x0, d0, 1.2), e = nearestFree(g, x1, d1, 1.2) >= 0 ? nearestFree(g, x1, d1, 1.2) : nearestFree(g, x1, d1, 2.2);   // V6.3: 목표가 가구에 붙어 있어도 가장 가까운 빈 칸까지는 온다
    if (s < 0 || e < 0) return null;
    const n = g.cols * g.rows;
    const gs = new Float32Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
    const ei = e % g.cols, ej = (e / g.cols) | 0;
    const hfn = k => { const i = k % g.cols, j = (k / g.cols) | 0; return Math.hypot(i - ei, j - ej); };
    const open = [s]; gs[s] = 0;
    const f = new Float32Array(n).fill(Infinity); f[s] = hfn(s);
    let guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0;
      for (let q = 1; q < open.length; q++) if (f[open[q]] < f[open[bi]]) bi = q;
      const c = open[bi]; open.splice(bi, 1);
      if (c === e) break;
      closed[c] = 1;
      const i = c % g.cols, j = (c / g.cols) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.cols || nj >= g.rows) continue;
        const k = nj * g.cols + ni;
        if (g.blocked[k] || closed[k]) continue;
        if (di && dj && (g.blocked[j * g.cols + ni] || g.blocked[nj * g.cols + i])) continue;
        const cost = gs[c] + (di && dj ? 1.4142 : 1);
        if (cost < gs[k]) {
          gs[k] = cost; came[k] = c; f[k] = cost + hfn(k);
          if (!open.includes(k)) open.push(k);
        }
      }
    }
    if (came[e] < 0 && s !== e) return null;
    const pts = [];
    let c = e;
    while (c >= 0) { pts.push({ x: -g.W / 2 + (c % g.cols + 0.5) * g.cs, d: (((c / g.cols) | 0) + 0.5) * g.cs }); if (c === s) break; c = came[c]; }
    pts.reverse();
    // simplify: keep every 3rd point plus end
    const out = [];
    for (let q = 0; q < pts.length; q++) if (q % 3 === 0 || q === pts.length - 1) out.push(pts[q]);
    return out;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  function validateLayout(lay, plan) {
    const reasons = [];
    const metrics = {};
    const ev = (plan && plan.events) || {};
    const S0 = { crouch: true, exitOpen: false, bridged: false, deviceDone: false, gateOpen: false };
    const S1 = { crouch: true, exitOpen: true, bridged: true, deviceDone: true, gateOpen: true };
    const g0 = makeGrid(lay, S0, PLAYER_R, 0.3);
    const start = nearestFree(g0, 0, lay.hasEntrance ? 0.9 : 2.2, 0.6);
    if (start < 0) reasons.push('entrance blocked');
    const d0 = bfs(g0, start);
    const reach = (pt, rad) => {
      // reachable cell within interaction radius of pt (and with clear line not needed)
      const R = Math.ceil(rad / g0.cs);
      const ci = Math.floor((pt.x + g0.W / 2) / g0.cs), cj = Math.floor(pt.d / g0.cs);
      for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= g0.cols || j >= g0.rows) continue;
        const x = -g0.W / 2 + (i + 0.5) * g0.cs, d = (j + 0.5) * g0.cs;
        if (Math.hypot(x - pt.x, d - pt.d) > rad) continue;
        if (d0[j * g0.cols + i] >= 0) return true;
      }
      return false;
    };
    lay.closets.forEach((c, i) => {
      if (!reach({ x: c.worldOffX, d: c.d }, INTERACT.closet - 0.3)) reasons.push('closet ' + i + ' unreachable');
    });
    lay.drawers.forEach((dr, i) => {
      if (!reach({ x: dr.x, d: dr.d }, INTERACT.drawer - 0.25)) reasons.push('drawer ' + i + ' unreachable' + (dr.loot === 'key' ? ' (KEY)' : ''));
    });
    if (lay.requiresKey) {
      if (lay.keyDrawer < 0 || !lay.drawers[lay.keyDrawer] || lay.drawers[lay.keyDrawer].loot !== 'key') reasons.push('key missing');
      if (lay.drawers.filter(dr => dr.loot === 'key').length < (lay.keysNeeded || 1)) reasons.push('not enough item drawers');
      if (lay.itemShortage) reasons.push('season item drawers missing');
      if (lay.chasm) reasons.push('key room must not contain chasm');
    }
    if (lay.chasm && (lay.closets.length || lay.drawers.length)) reasons.push('bridge room has closet/drawer');
    if (lay.chasm && (ev.rush || ev.ambush)) reasons.push('rush/ambush scheduled in bridge room');
    if (lay.terminal) {
      if (!reach({ x: lay.terminal.x, d: lay.terminal.mode === 'keypad' ? lay.frontD - 0.75 : lay.terminal.d }, INTERACT.terminal - 0.35)) reasons.push('terminal unreachable');
    } else if (lay.puzzleKind !== 'none' && lay.puzzleKind !== 'bridge' && lay.arch !== 'seek') reasons.push('terminal missing');
    if (lay.chasm && lay.terminal && lay.terminal.d > lay.chasm.d0) reasons.push('bridge terminal beyond chasm');
    if (lay.terminal && lay.terminal.access && nearCloset(lay, lay.terminal.access.x, lay.terminal.access.d)) reasons.push('terminal too close to a closet (E would open the closet)');
    if (lay.dupeDoors) {
      lay.dupeDoors.forEach((dd, i) => { if (!reach({ x: dd.x, d: lay.frontD }, INTERACT.door - 0.4)) reasons.push('dupe door ' + i + ' unreachable'); });
      if (lay.dupeDoors.filter(x => x.correct).length !== 1) reasons.push('dupe must have exactly one correct door');
    } else if (!lay.chasm && lay.arch !== 'seek' && !reach({ x: lay.exitX, d: lay.frontD }, INTERACT.door - 0.4)) reasons.push('exit door unreachable before solving');
    // overlaps among furniture & obstacles
    const fps = footprints(lay).filter(f => !['beam', 'lowWall', 'chasm', 'chasmSide', 'monolithMoved', 'creak', 'gateDoor', 'gateDoorWrong', 'gateWall', 'wall', 'partition', 'niche', 'nicheBack'].includes(f.tag));
    for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
      if (fpOverlap(fps[i], fps[j], 0.05)) reasons.push('overlap ' + fps[i].tag + '/' + fps[j].tag);
    }
    // furniture vs walls/partitions
    const walls = footprints(lay).filter(f => ['wall', 'partition', 'niche', 'nicheBack', 'gateWall'].includes(f.tag));
    fps.forEach(f => walls.forEach(w => { if (fpOverlap(f, w, 0.0)) reasons.push('furniture in wall ' + f.tag); }));
    // furniture must not sit over the chasm
    if (lay.chasm) fps.forEach(f => { const o = f.o; const dd = o.d; if (dd > lay.chasm.d0 - 0.2 && dd < lay.chasm.d1 + 0.2) reasons.push('object over chasm'); });
    // shelves / props on the floor
    lay.rects.forEach(rc => { if (['shelf', 'crate', 'debris', 'podium', 'monolith', 'voxelPad', 'sorterPad'].includes(rc.kind) && rc.y0 !== 0) reasons.push('floating ' + rc.kind); });
    // solved: entrance → exit
    const g1 = makeGrid(lay, S1, PLAYER_R, 0.3);
    const s1 = nearestFree(g1, 0, lay.hasEntrance ? 0.9 : 2.2, 0.6);
    const d1 = bfs(g1, s1);
    const exitCell = nearestFree(g1, lay.exitX, lay.L + 0.3, 0.4);
    if (exitCell < 0 || d1[exitCell] < 0) reasons.push('no path entrance→exit after solving');
    else metrics.pathToExit = d1[exitCell];
    // comfortable width for chase / patrol rooms
    if (lay.arch === 'seek') {
      const gw = makeGrid(lay, S1, PLAYER_R + 0.18, 0.3);
      const sw = nearestFree(gw, 0, 0.9, 0.8), ew = nearestFree(gw, 0, lay.L + 0.2, 0.6);
      const dw = bfs(gw, sw);
      if (ew < 0 || dw[ew] < 0) reasons.push('seek corridor too narrow');
      // crouch beams must actually be necessary only at beams: standing path blocked by beams is fine
      const gc = makeGrid(lay, Object.assign({}, S1, { gateOpen: false }), PLAYER_R, 0.3);
      const dc = bfs(gc, nearestFree(gc, 0, 0.9, 0.6));
      const ec = nearestFree(gc, 0, lay.L + 0.2, 0.6);
      if (ec >= 0 && dc[ec] >= 0) reasons.push('seek gate not blocking');
    }
    if (lay.figure) {
      const gf = makeGrid(lay, S1, 0.55, 0.5);
      const pts = [lay.figure.start].concat(lay.figure.waypoints);
      const dist = bfs(gf, nearestFree(gf, pts[0].x, pts[0].d, 0.8));
      pts.forEach((p, i) => { const c = nearestFree(gf, p.x, p.d, 0.8); if (c < 0 || dist[c] < 0) reasons.push('figure waypoint ' + i + ' unreachable'); });
      const pc = nearestFree(gf, 0, 1.2, 1.0);
      if (pc < 0 || dist[pc] < 0) reasons.push('figure cannot reach entrance area');
    }
    // Rush fairness: from anywhere reachable, a closet must be close by path
    if (ev.rush || ev.ambush) {
      if (!lay.closets.length) reasons.push('rush room without closet');
      else {
        const cells = lay.closets.map(c => nearestFree(g0, c.access.x, c.access.d, 0.8));
        const dc = multiBfs(g0, cells);
        let worst = 0;
        for (let k = 0; k < d0.length; k++) if (d0[k] >= 0) {
          if (dc[k] < 0) { worst = 999; break; }
          if (dc[k] > worst) worst = dc[k];
        }
        metrics.rushWorst = worst;
        if (worst > 17.5) reasons.push('closet too far for rush (' + worst.toFixed(1) + 'm)');
      }
    }
    // secret room must be reachable
    if (lay.secret) {
      if (!reach({ x: lay.secret.x, d: lay.secret.d }, 1.6)) reasons.push('secret/side room unreachable');
    }
    return { ok: reasons.length === 0, reasons, metrics };
  }

  function generateRoom(seed, roomPlan, puzzle) {
    const tried = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      const lay = buildLayout(roomPlan.door, roomPlan.arch, seed, puzzle, attempt, false, roomPlan.events);
      const v = validateLayout(lay, roomPlan);
      if (v.ok) { lay.attempt = attempt; lay.validation = v; return lay; }
      tried.push(v.reasons.join(';'));
    }
    const lay = buildLayout(roomPlan.door, roomPlan.arch, seed, puzzle, 99, true, roomPlan.events);
    const v = validateLayout(lay, roomPlan);
    lay.attempt = 99; lay.validation = v; lay.failedAttempts = tried;
    return lay;
  }

  // ---------------------------------------------------------------------------
  // Checkpoint save / load
  // ---------------------------------------------------------------------------
  const SAVE_KEY = 'mathDoorsV5_checkpoint';
  const SAVE_VERSION = 5;
  function storage() { try { return root.localStorage || null; } catch (_) { return null; } }
  const SaveManager = {
    key: SAVE_KEY,
    save(data) {
      const ls = storage(); if (!ls) return { ok: false, reason: 'no-storage' };
      try {
        const payload = Object.assign({}, data, { v: SAVE_VERSION, core: CORE_VERSION, savedAt: Date.now() });
        ls.setItem(SAVE_KEY, JSON.stringify(payload));
        return { ok: true };
      } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
    },
    load() {
      const ls = storage(); if (!ls) return { ok: false, reason: 'no-storage' };
      let raw = null;
      try { raw = ls.getItem(SAVE_KEY); } catch (e) { return { ok: false, reason: 'read-error' }; }
      if (!raw) return { ok: false, reason: 'empty' };
      let d;
      try { d = JSON.parse(raw); } catch (_) { return { ok: false, reason: 'corrupt' }; }
      if (!d || typeof d !== 'object') return { ok: false, reason: 'corrupt' };
      if (d.v !== SAVE_VERSION) return { ok: false, reason: 'old-version' };
      const okNum = (v, a, b) => typeof v === 'number' && isFinite(v) && v >= a && v <= b;
      if (!okNum(d.seed, 0, 4294967295) || ![10, 20, 30].includes(d.maxDoors) || !okNum(d.door, 1, d.maxDoors) ||
        !Array.isArray(d.units) || !d.units.length || d.units.some(u => ![1, 2, 3, 4, 5, 6].includes(u)) ||
        !['easy', 'normal', 'challenge'].includes(d.difficulty) || !okNum(d.hearts, 1, 3)) return { ok: false, reason: 'invalid' };
      return { ok: true, data: d };
    },
    clear() { const ls = storage(); if (!ls) return; try { ls.removeItem(SAVE_KEY); } catch (_) { /* ignore */ } },
    // remove legacy keys from older builds that might confuse users
    clearLegacy() { const ls = storage(); if (!ls) return; try { ['mathDoorsCheckpoint', 'mathDoors_save', 'mathDoorsV4_checkpoint'].forEach(k => ls.removeItem(k)); } catch (_) { /* ignore */ } }
  };

  const api = {
    CORE_VERSION, setSeason, getSeason, ROOM_H, PLAYER_R, WALL_T, DOOR_HALF, INTERACT, ARCH_LABELS,
    hashStr, makeRng, newSeed, planStage, stageConfig, buildLayout, validateLayout, generateRoom,
    pointBlocked, resolvePoint, moveCircle, makeGrid, bfs, findPath, nearestFree, rectActive, footprints, SaveManager
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MathDoorsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
