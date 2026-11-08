(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const EL = (cls, css) => { const d = document.createElement('div'); if (cls) d.className = cls; if (css) Object.assign(d.style, css); return d; };
  const g = 0.26, P = 1 + g, T = 9 + 8 * g, K = 100 / T; // 盤面を「マス幅=1、溝=g」の単位で扱う
  const NAMES = ['赤', '青'], COL = ['#d63a2f', '#2f6fd6'], L = 'abcdefghi';
  const MSG = { overlap: '壁が重なっています', cross: '壁が交差しています', block: 'ゴールを塞ぐ壁は置けません', none: '壁がもうありません', range: '置けない場所です' };
  let moves = [], idx = 0, mode = 'move', pending = null, down = null, S = Q.create();
  const inner = $('#inner'), pct = v => v * K + '%';
  const zones = [0, 1].map(p => $(`.zone[data-p="${p}"]`));
  const q = (p, s) => zones[p].querySelector(s);

  // 盤面の構築
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const d = EL('', { left: pct(c * P), top: pct(r * P), width: pct(1), height: pct(1) });
    if (r === 0) d.style.boxShadow = 'inset 0 4px 0 rgba(214,58,47,.65)';
    if (r === 8) d.style.boxShadow = 'inset 0 -4px 0 rgba(47,111,214,.65)';
    $('#cells').appendChild(d);
  }
  const pawns = [0, 1].map(p => {
    const d = EL('pawn', { width: pct(1), height: pct(1) }), [a, b, c] = p ? ['#9cc4ff', '#2f6fd6', '#123c8a'] : ['#ff9d8e', '#d63a2f', '#7d1710'];
    d.innerHTML = `<svg viewBox="0 0 40 44"><defs><radialGradient id="h${p}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient><linearGradient id="b${p}" x1="0" x2="1"><stop offset="0" stop-color="${b}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><ellipse cx="20" cy="40" rx="14" ry="3.6" fill="rgba(0,0,0,.4)"/><path d="M11 38Q14 25 17 20h6q3 5 6 18-9 3.5-18 0z" fill="url(#b${p})"/><circle cx="20" cy="13" r="9.5" fill="url(#h${p})"/><ellipse cx="16.5" cy="9.5" rx="3.2" ry="2" fill="rgba(255,255,255,.7)" transform="rotate(-30 16.5 9.5)"/></svg>`;
    $('#pawns').appendChild(d); return d;
  });
  const wallBox = (o, r, c) => o === 'h'
    ? { left: pct(c * P), top: pct(r * P + 1), width: pct(2 + g), height: pct(g) }
    : { left: pct(c * P + 1), top: pct(r * P), width: pct(g), height: pct(2 + g) };

  const sync = () => { S = Q.replay(moves.slice(0, idx)); };
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 1800); };
  const fmt = m => `${NAMES[m.p]}: ${m.t === 'm' ? '移動' : (m.o === 'h' ? '横壁' : '縦壁')} ${L[m.c]}${9 - m.r}`;
  const setMode = m => { mode = m; pending = null; render(); };
  const commit = m => { moves.length = idx; moves.push(m); idx++; sync(); pending = null; mode = 'move'; render(); };

  function render() {
    const over = S.win >= 0;
    const err = pending ? Q.wallError(S, pending.o, pending.r, pending.c) : 'x';
    [0, 1].forEach(p => {
      pawns[p].style.left = pct(S.pos[p][1] * P); pawns[p].style.top = pct(S.pos[p][0] * P);
      const mine = !over && S.turn === p;
      q(p, '.pl').classList.toggle('on', mine);
      q(p, '.cnt').textContent = S.left[p];
      q(p, '.pips').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < S.left[p] ? '' : 'off'}"></i>`).join('');
      q(p, '.bMove').disabled = !mine;
      q(p, '.bMove').setAttribute('aria-pressed', mine && mode === 'move');
      q(p, '.bH').disabled = q(p, '.bV').disabled = !mine || S.left[p] <= 0;
      q(p, '.bH').setAttribute('aria-pressed', mine && mode === 'h');
      q(p, '.bV').setAttribute('aria-pressed', mine && mode === 'v');
      q(p, '.bOk').disabled = !mine || !!err;
      q(p, '.bUndo').disabled = idx === 0;
      q(p, '.bRedo').disabled = idx === moves.length;
    });
    const W = $('#walls'); W.innerHTML = '';
    moves.slice(0, idx).filter(m => m.t === 'w').forEach(m => W.appendChild(EL('w ' + m.o, wallBox(m.o, m.r, m.c))));
    const D = $('#dots'); D.innerHTML = '';
    if (mode === 'move' && !over) Q.legalMoves(S).forEach(([r, c]) => D.appendChild(EL('dot', { left: pct(c * P), top: pct(r * P), width: pct(1), height: pct(1) })));
    const pv = $('#pv');
    pv.hidden = !pending;
    if (pending) { Object.assign(pv.style, wallBox(pending.o, pending.r, pending.c)); pv.classList.toggle('bad', !!err); }
    $('#list').innerHTML = moves.length ? moves.map((m, i) => `<li data-i="${i}" class="${i < idx ? 'done' : ''} ${i === idx - 1 ? 'cur' : ''}">${fmt(m)}</li>`).join('') : '<p>まだ手がありません</p>';
    $('#win').classList.toggle('show', over);
    if (over) for (const id of ['#winText', '#winText2']) { $(id).textContent = NAMES[S.win] + 'の勝利'; $(id).style.color = COL[S.win]; }
  }

  // 盤面入力(座標から計算するので、縦壁・横壁どちらも確実に選べる)
  const xy = e => { const b = inner.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * T, (e.clientY - b.top) / b.height * T]; };
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const slot = (x, y) => ({ c: cl(Math.round((x + g / 2) / P - 1), 0, 7), r: cl(Math.round((y + g / 2) / P - 1), 0, 7), o: mode });
  const same = (a, b) => a && b && a.r === b.r && a.c === b.c && a.o === b.o;
  inner.addEventListener('pointerdown', e => {
    if (S.win >= 0) return;
    const [x, y] = xy(e);
    if (mode === 'move') {
      const c = cl(Math.floor(x / P), 0, 8), r = cl(Math.floor(y / P), 0, 8);
      if (Q.legalMoves(S).some(m => m[0] === r && m[1] === c)) commit({ p: S.turn, t: 'm', r, c });
      return;
    }
    down = { prev: pending }; pending = slot(x, y); inner.setPointerCapture(e.pointerId); render();
  });
  inner.addEventListener('pointermove', e => { if (!down) return; const n = slot(...xy(e)); if (!same(n, pending)) { pending = n; render(); } });
  inner.addEventListener('pointerup', () => { if (!down) return; const again = same(down.prev, pending); down = null; if (again) place(); });
  inner.addEventListener('pointercancel', () => { down = null; });
  function place() {
    if (!pending) return;
    const e = Q.wallError(S, pending.o, pending.r, pending.c);
    if (e) { toast(MSG[e]); return; }
    commit({ p: S.turn, t: 'w', o: pending.o, r: pending.r, c: pending.c });
  }

  // ボタン(上下どちらのプレイヤー用も同じ処理)
  const undo = () => { if (idx > 0) { idx--; sync(); pending = null; mode = 'move'; render(); } };
  const redo = () => { if (idx < moves.length) { idx++; sync(); pending = null; render(); } };
  const restart = () => { moves = []; idx = 0; pending = null; mode = 'move'; sync(); render(); };
  $$('.bMove').forEach(b => b.onclick = () => setMode('move'));
  $$('.bH').forEach(b => b.onclick = () => setMode('h'));
  $$('.bV').forEach(b => b.onclick = () => setMode('v'));
  $$('.bOk').forEach(b => b.onclick = place);
  $$('.bUndo').forEach(b => b.onclick = undo);
  $$('.bRedo').forEach(b => b.onclick = redo);
  $$('.bHist').forEach(b => b.onclick = () => $('#sheet').classList.add('show'));
  $$('.bReset').forEach(b => b.onclick = () => {
    if (b.classList.contains('arm')) { clearTimeout(b.t); $$('.bReset').forEach(x => { x.classList.remove('arm'); x.textContent = '最初から'; }); restart(); return; }
    $$('.bReset').forEach(x => { x.classList.remove('arm'); x.textContent = '最初から'; });
    b.classList.add('arm'); b.textContent = 'もう一度タップ';
    clearTimeout(b.t); b.t = setTimeout(() => { b.classList.remove('arm'); b.textContent = '最初から'; }, 2500);
  });
  $('#again').onclick = restart; $('#winUndo').onclick = undo;
  $('#close').onclick = () => $('#sheet').classList.remove('show');
  $('#list').onclick = e => { const li = e.target.closest('li'); if (li) { idx = +li.dataset.i + 1; sync(); pending = null; render(); } };

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  render();
})();

