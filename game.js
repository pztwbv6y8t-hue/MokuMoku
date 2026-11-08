/* Quoridor ルールエンジン(画面に依存しない)。row 0 = 画面上端。P0=赤(下から上へ)、P1=青(上から下へ)。
   壁(r,c)は、マス(r,c)の右下の交点に置く2マス分の壁。 h:横壁(行r/r+1の間、列c,c+1) v:縦壁(列c/c+1の間、行r,r+1) */
(function (root) {
  const N = 9, W = 8, GOAL = [0, 8];
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const grid = () => Array.from({ length: W }, () => Array(W).fill(false));
  const create = () => ({ pos: [[8, 4], [0, 4]], left: [10, 10], h: grid(), v: grid(), turn: 0, win: -1 });
  const inb = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const at = (a, r, c) => r >= 0 && r < W && c >= 0 && c < W && a[r][c];

  function blocked(s, r, c, dr, dc) {
    if (dr === 1) return at(s.h, r, c) || at(s.h, r, c - 1);
    if (dr === -1) return at(s.h, r - 1, c) || at(s.h, r - 1, c - 1);
    if (dc === 1) return at(s.v, r, c) || at(s.v, r - 1, c);
    return at(s.v, r, c - 1) || at(s.v, r - 1, c - 1);
  }

  function legalMoves(s, p = s.turn) {
    const [r, c] = s.pos[p], [or, oc] = s.pos[1 - p], out = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!inb(nr, nc) || blocked(s, r, c, dr, dc)) continue;
      if (nr !== or || nc !== oc) { out.push([nr, nc]); continue; }
      const jr = nr + dr, jc = nc + dc;
      if (inb(jr, jc) && !blocked(s, nr, nc, dr, dc)) out.push([jr, jc]);
      else for (const [pr, pc] of DIRS) {
        if (pr * dr + pc * dc !== 0) continue; // 直交方向のみ
        const ar = nr + pr, ac = nc + pc;
        if (inb(ar, ac) && !blocked(s, nr, nc, pr, pc)) out.push([ar, ac]);
      }
    }
    return out;
  }

  function hasPath(s, p) {
    const seen = new Set(), q = [s.pos[p]];
    seen.add(s.pos[p].join());
    while (q.length) {
      const [r, c] = q.shift();
      if (r === GOAL[p]) return true;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
        if (inb(nr, nc) && !seen.has(k) && !blocked(s, r, c, dr, dc)) { seen.add(k); q.push([nr, nc]); }
      }
    }
    return false;
  }

  // 置けない理由を返す(置けるなら null)
  function wallError(s, o, r, c) {
    if (s.win >= 0) return 'over';
    if (s.left[s.turn] <= 0) return 'none';
    if (!(r >= 0 && r < W && c >= 0 && c < W)) return 'range';
    if (s.h[r][c] || s.v[r][c]) return s.h[r][c] && o === 'h' || s.v[r][c] && o === 'v' ? 'overlap' : 'cross';
    if (o === 'h' ? at(s.h, r, c - 1) || at(s.h, r, c + 1) : at(s.v, r - 1, c) || at(s.v, r + 1, c)) return 'overlap';
    const a = o === 'h' ? s.h : s.v;
    a[r][c] = true;
    const ok = hasPath(s, 0) && hasPath(s, 1);
    a[r][c] = false;
    return ok ? null : 'block';
  }

  // 手を適用(不正なら例外)。move: {p,t:'m',r,c} / {p,t:'w',o,r,c}
  function apply(s, m) {
    if (s.win >= 0) throw new Error('game over');
    if (m.p !== s.turn) throw new Error('not your turn');
    if (m.t === 'm') {
      if (!legalMoves(s).some(([r, c]) => r === m.r && c === m.c)) throw new Error('illegal move');
      s.pos[m.p] = [m.r, m.c];
      if (m.r === GOAL[m.p]) s.win = m.p;
    } else {
      const e = wallError(s, m.o, m.r, m.c);
      if (e) throw new Error('illegal wall: ' + e);
      (m.o === 'h' ? s.h : s.v)[m.r][m.c] = true;
      s.left[m.p]--;
    }
    if (s.win < 0) s.turn = 1 - s.turn;
    return s;
  }

  // 履歴から盤面を再構築(Undo/Redoは常にこれで整合を保つ)
  function replay(moves) { const s = create(); for (const m of moves) apply(s, m); return s; }

  const api = { N, W, GOAL, create, legalMoves, wallError, apply, replay, hasPath, blocked };
  if (typeof module !== 'undefined') module.exports = api; else root.Q = api;
})(typeof self !== 'undefined' ? self : this);
