// 브라우저에서 실행: 같은 평면에 같은 방향으로 겹친 면(움직일 때 깜빡임 = z-fighting) 찾기
// 축 정렬된 상자(BoxGeometry·둥근 상자)만 검사. 반환: [{a, b, axis, at, area}]
(function () {
  const faces = [], boxes = [];
  const box = new THREE.Box3(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let id = 0;
  scene.traverseVisible(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
    const g = o.geometry; if (!g.attributes || !g.attributes.position) return;
    if (!(g.type === 'BoxGeometry' || (g.parameters === undefined && g.attributes.position.count <= 600 && g.index))) return;
    if (o.material && (o.material.transparent || o.material.polygonOffset)) return;
    o.matrixWorld.decompose(v, q, sc);
    // 90도 단위 회전만 (축 정렬)
    const e = new THREE.Euler().setFromQuaternion(q);
    const ok = [e.x, e.y, e.z].every(a => Math.abs(Math.round(a / (Math.PI / 2)) * (Math.PI / 2) - a) < 1e-3);
    if (!ok) return;
    if (!g.boundingBox) g.computeBoundingBox();
    box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    const size = box.getSize(new THREE.Vector3());
    if (Math.min(size.x, size.y, size.z) < 0.004) return;   // 판(평면)은 제외
    const name = (o.material && o.material.name) || (o.material && o.material.type) || '?';
    const myId = id++;
    const mn = box.min.clone(), mx = box.max.clone();
    boxes.push([mn.x, mn.y, mn.z, mx.x, mx.y, mx.z]);
    ['x', 'y', 'z'].forEach((ax, i) => {
      const others = ['x', 'y', 'z'].filter(a => a !== ax);
      for (const side of [-1, 1]) {
        faces.push({ id: myId, ax, side, c: side < 0 ? mn[ax] : mx[ax], r: [mn[others[0]], mx[others[0]], mn[others[1]], mx[others[1]]], mesh: o, name,
          pos: [((mn.x + mx.x) / 2).toFixed(2), ((mn.y + mx.y) / 2).toFixed(2), ((mn.z + mx.z) / 2).toFixed(2)] });
      }
    });
  });
  const buckets = new Map();
  faces.forEach(f => { const k = f.ax + f.side + ':' + Math.round(f.c * 1000); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(f); });
  const out = [];
  buckets.forEach(list => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j]; if (a.id === b.id) continue;
      if (a.mesh.parent === b.mesh.parent && a.mesh.parent && a.mesh.parent.type === 'Group' && a.mesh.parent.parent && a.mesh.parent.parent.type === 'Scene' && false) continue;
      const w = Math.min(a.r[1], b.r[1]) - Math.max(a.r[0], b.r[0]), h = Math.min(a.r[3], b.r[3]) - Math.max(a.r[2], b.r[2]);
      // 겹친 부분 바로 앞(면 바깥 1 cm)이 다른 상자 속이면 보이지 않는 면 → 깜빡임 없음
      const others = ['x', 'y', 'z'].filter(q => q !== a.ax);
      const pt = { x: 0, y: 0, z: 0 };
      pt[a.ax] = a.c + a.side * 0.01;
      pt[others[0]] = (Math.max(a.r[0], b.r[0]) + Math.min(a.r[1], b.r[1])) / 2;
      pt[others[1]] = (Math.max(a.r[2], b.r[2]) + Math.min(a.r[3], b.r[3])) / 2;
      const hidden = boxes.some(bx => pt.x > bx[0] && pt.x < bx[3] && pt.y > bx[1] && pt.y < bx[4] && pt.z > bx[2] && pt.z < bx[5]);
      if (w > 0.02 && h > 0.02 && !hidden) out.push({ ax: a.ax + (a.side > 0 ? '+' : '-'), at: a.c.toFixed(3), area: +(w * h).toFixed(3), a: a.pos.join(','), b: b.pos.join(','),
        ma: a.mesh.material === b.mesh.material ? 'same' : 'diff' });
    }
  });
  return out;
})();
