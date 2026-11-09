/* コンピュータ対戦用のAI(外部通信なし)。盤面を評価して、先読みで一手を選ぶ。 */
(function (root) {
  const Q = typeof module !== 'undefined' ? require('./game.js') : root.Q;

  // 相手の最短経路を邪魔する壁の候補
  function wallSlotsAgainst(s, p) {
    const path = Q.shortestPath(s, p), out = [];
    if (!path) return out;
    for (let i = 0; i < path.length - 1; i++) {
      const [r, c] = path[i], [nr, nc] = path[i + 1];
      if (nr > r) out.push(['h', r, c], ['h', r, c - 1]);
      else if (nr < r) out.push(['h', r - 1, c], ['h', r - 1, c - 1]);
      else if (nc > c) out.push(['v', r, c], ['v', r - 1, c]);
      else out.push(['v', r, c - 1], ['v', r - 1, c - 1]);
    }
    return out;
  }
  function cands(s) {
    const p = s.turn, list = Q.legalMoves(s).map(([r, c]) => ({ p, t: 'm', r, c }));
    if (s.left[p] > 0) {
      const seen = new Set();
      for (const [o, r, c] of wallSlotsAgainst(s, 1 - p)) {
        const k = o + r + ',' + c;
        if (seen.has(k)) continue; seen.add(k);
        if (Q.wallError(s, o, r, c) === null) list.push({ p, t: 'w', o, r, c });
      }
    }
    return list;
  }
  // me から見た盤面の良さ(最短距離の差と、残り壁の差)
  const ev = (s, me) => (Q.dist(s, 1 - me) - Q.dist(s, me)) * 10 + (s.left[me] - s.left[1 - me]) * 4;

  function mm(s, d, al, be, me) {
    if (s.win >= 0) return s.win === me ? 1000 + d : -1000 - d;
    if (d === 0) return ev(s, me);
    const max = s.turn === me; let best = max ? -Infinity : Infinity;
    for (const m of cands(s)) {
      const t = Q.applyFast(Q.clone(s), m), v = mm(t, d - 1, al, be, me);
      if (max) { if (v > best) best = v; if (v > al) al = v; } else { if (v < best) best = v; if (v < be) be = v; }
      if (be <= al) break;
    }
    return best;
  }

  // level: 1=かんたん 2=ふつう 3=つよい
  function choose(s, level) {
    const me = s.turn, depth = [1, 1, 2, 3][level] || 2, noise = [25, 25, 3, 0.5][level] ?? 3;
    let ms = cands(s);
    if (level === 1) ms = ms.filter(m => m.t === 'm' || Math.random() < 0.3);
    let best = null, bv = -Infinity;
    for (const m of ms) {
      const t = Q.applyFast(Q.clone(s), m);
      const v = mm(t, depth - 1, bv - noise, Infinity, me) + Math.random() * noise;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }

  const api = { choose, cands };
  if (typeof module !== 'undefined') module.exports = api; else root.AI = api;
})(typeof self !== 'undefined' ? self : this);
