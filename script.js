(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const EL = (cls, css) => { const d = document.createElement('div'); if (cls) d.className = cls; if (css) Object.assign(d.style, css); return d; };
  const g = 0.26, P = 1 + g, T = 9 + 8 * g, K = 100 / T; // 盤面を「マス幅=1、溝=g」の単位で扱う
  const NAMES = ['黒', '白'], L = 'abcdefghi';
  const MSG = { overlap: '壁が重なっています', cross: '壁が交差しています', block: 'ゴールを塞ぐ壁は置けません', none: '壁がもうありません', range: '置けない場所です' };
  let moves = [], idx = 0, mode = 'move', pending = null, down = null, S = Q.create();
  let cpu = null; // コンピュータ対戦のとき {me, cpu, level, busy}
  const inner = $('#inner'), pct = v => v * K + '%';
  const zones = [0, 1].map(p => $(`.zone[data-p="${p}"]`));
  const q = (p, s) => zones[p].querySelector(s);

  // 盤面の構築
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const d = EL('', { left: pct(c * P), top: pct(r * P), width: pct(1), height: pct(1) });
    if (r === 0) d.style.boxShadow = 'inset 0 4px 0 #111';
    if (r === 8) d.style.boxShadow = 'inset 0 -4px 0 #fff, inset 0 -5px 0 rgba(0,0,0,.35)';
    $('#cells').appendChild(d);
  }
  const pawns = [0, 1].map(p => { // 囲碁の石(0=黒、1=白)
    const d = EL('pawn p' + p, { width: pct(1), height: pct(1) });
    const st = p ? ['#ffffff', '#e8e8e8', '#b4b4b4'] : ['#808080', '#1c1c1c', '#000000'];
    d.innerHTML = `<svg viewBox="0 0 40 40"><defs><radialGradient id="s${p}" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="${st[0]}"/><stop offset=".55" stop-color="${st[1]}"/><stop offset="1" stop-color="${st[2]}"/></radialGradient></defs><circle cx="20" cy="20" r="15.5" fill="url(#s${p})" stroke="${p ? '#8a7350' : '#000'}" stroke-width=".9"/><ellipse cx="14.5" cy="12.5" rx="5" ry="3" fill="rgba(255,255,255,${p ? '.9' : '.35'})" transform="rotate(-30 14.5 12.5)"/></svg>`;
    $('#pawns').appendChild(d); return d;
  });
  const wallBox = (o, r, c) => o === 'h'
    ? { left: pct(c * P), top: pct(r * P + 1), width: pct(2 + g), height: pct(g) }
    : { left: pct(c * P + 1), top: pct(r * P), width: pct(g), height: pct(2 + g) };

  const sync = () => { S = Q.replay(moves.slice(0, idx)); };
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 2200); };
  const fmt = m => `${NAMES[m.p]}: ${m.t === 'm' ? '移動' : (m.o === 'h' ? '横壁' : '縦壁')} ${L[m.c]}${9 - m.r}`;
  const setMode = m => { mode = m; pending = null; render(); };
  const busy = () => !!(cpu && cpu.busy);
  // コンピュータ対戦での戻す/やり直す先(自分の手番に戻る位置)。なければ -1
  const undoTarget = () => { if (!cpu) return idx > 0 ? idx - 1 : -1; let t = idx - 1; if (t % 2 !== cpu.me) t--; return t >= 0 ? t : -1; };
  const redoTarget = () => { if (!cpu) return idx < moves.length ? idx + 1 : -1; return idx + 2 <= moves.length ? idx + 2 : idx + 1 === moves.length ? idx + 1 : -1; };

  // ---- 操作 ----
  function commit(m) {
    moves.length = idx; moves.push(m); idx++; sync(); pending = null; mode = 'move'; render(); maybeCpu();
  }
  const undo = () => { const t = undoTarget(); if (busy() || t < 0) return; idx = t; sync(); pending = null; mode = 'move'; render(); maybeCpu(); };
  const redo = () => { const t = redoTarget(); if (busy() || t < 0) return; idx = t; sync(); pending = null; render(); maybeCpu(); };
  const restart = () => { if (busy()) return; moves = []; idx = 0; pending = null; mode = 'move'; sync(); render(); maybeCpu(); };
  function place() {
    if (!pending) return;
    const e = Q.wallError(S, pending.o, pending.r, pending.c);
    if (e) { toast(MSG[e]); return; }
    commit({ p: S.turn, t: 'w', o: pending.o, r: pending.r, c: pending.c });
  }
  // コンピュータの番なら考えて指す
  function maybeCpu() {
    if (!cpu || cpu.busy || S.win >= 0 || S.turn !== cpu.cpu || idx !== moves.length) return;
    cpu.busy = true; render();
    setTimeout(() => {
      let m = null;
      try { m = AI.choose(Q.clone(S), cpu.level); } catch (e) { m = null; }
      if (!m) { const [r, c] = Q.legalMoves(S)[0]; m = { p: S.turn, t: 'm', r, c }; }
      cpu.busy = false; commit(m);
    }, 450);
  }

  function render() {
    const over = S.win >= 0;
    const err = pending ? Q.wallError(S, pending.o, pending.r, pending.c) : 'x';
    [0, 1].forEach(p => {
      pawns[p].style.left = pct(S.pos[p][1] * P); pawns[p].style.top = pct(S.pos[p][0] * P);
      const mine = !over && S.turn === p && (!cpu || (p === cpu.me && !cpu.busy));
      q(p, '.pl').classList.toggle('on', !over && S.turn === p);
      q(p, '.cnt').textContent = S.left[p];
      q(p, '.pips').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < S.left[p] ? '' : 'off'}"></i>`).join('');
      q(p, '.turn').textContent = cpu && p === cpu.cpu && cpu.busy ? '考え中…' : '手番';
      q(p, '.bMove').disabled = !mine;
      q(p, '.bMove').setAttribute('aria-pressed', mine && mode === 'move');
      q(p, '.bH').disabled = q(p, '.bV').disabled = !mine || S.left[p] <= 0;
      q(p, '.bH').setAttribute('aria-pressed', mine && mode === 'h');
      q(p, '.bV').setAttribute('aria-pressed', mine && mode === 'v');
      q(p, '.bOk').disabled = !mine || !!err;
      q(p, '.bUndo').disabled = busy() || undoTarget() < 0;
      q(p, '.bRedo').disabled = busy() || redoTarget() < 0;
      q(p, '.bReset').disabled = busy();
    });
    const W = $('#walls'); W.innerHTML = '';
    moves.slice(0, idx).filter(m => m.t === 'w').forEach(m => W.appendChild(EL('w ' + m.o, wallBox(m.o, m.r, m.c))));
    const D = $('#dots'); D.innerHTML = '';
    const myTurn = !cpu || (cpu.me === S.turn && !cpu.busy);
    if (mode === 'move' && !over && myTurn) Q.legalMoves(S).forEach(([r, c]) => D.appendChild(EL('dot', { left: pct(c * P), top: pct(r * P), width: pct(1), height: pct(1) })));
    const pv = $('#pv');
    pv.hidden = !pending;
    if (pending) { Object.assign(pv.style, wallBox(pending.o, pending.r, pending.c)); pv.classList.toggle('bad', !!err); }
    $('#list').innerHTML = moves.length ? moves.map((m, i) => `<li data-i="${i}" class="${i < idx ? 'done' : ''} ${i === idx - 1 ? 'cur' : ''}">${fmt(m)}</li>`).join('') : '<p>まだ手がありません</p>';
    $('#win').classList.toggle('show', over);
    if (over) {
      const t = cpu ? (S.win === cpu.me ? 'あなたの勝ち!' : 'コンピュータの勝ち') : NAMES[S.win] + 'の勝利';
      for (const id of ['#winText', '#winText2']) { $(id).textContent = t; $(id).style.color = '#f6e9cf'; }
    }
  }

  // 盤面入力(座標から計算するので、縦壁・横壁どちらも確実に選べる)
  const xy = e => {
    const b = inner.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * T, y = (e.clientY - b.top) / b.height * T;
    return cpu && cpu.me === 1 ? [T - x, T - y] : [x, y]; // 白で遊ぶときは盤面を180度回している
  };
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const slot = (x, y) => ({ c: cl(Math.round((x + g / 2) / P - 1), 0, 7), r: cl(Math.round((y + g / 2) / P - 1), 0, 7), o: mode });
  const same = (a, b) => a && b && a.r === b.r && a.c === b.c && a.o === b.o;
  inner.addEventListener('pointerdown', e => {
    if (S.win >= 0 || (cpu && (cpu.busy || S.turn !== cpu.me))) return;
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

  // ボタン(上下どちらのプレイヤー用も同じ処理)
  $$('.bMove').forEach(b => b.onclick = () => setMode('move'));
  $$('.bH').forEach(b => b.onclick = () => setMode('h'));
  $$('.bV').forEach(b => b.onclick = () => setMode('v'));
  $$('.bOk').forEach(b => b.onclick = place);
  $$('.bUndo').forEach(b => b.onclick = undo);
  $$('.bRedo').forEach(b => b.onclick = redo);
  $$('.bHist').forEach(b => b.onclick = () => $('#sheet').classList.add('show'));
  $$('.bReset').forEach(b => b.onclick = () => {
    const clear = () => $$('.bReset').forEach(x => { x.classList.remove('arm'); x.textContent = '最初から'; });
    if (b.classList.contains('arm')) { clearTimeout(b.t); clear(); restart(); return; }
    clear(); b.classList.add('arm'); b.textContent = 'もう一度タップ';
    clearTimeout(b.t); b.t = setTimeout(clear, 2500);
  });
  $('#again').onclick = restart; $('#winUndo').onclick = undo;
  $('#close').onclick = () => $('#sheet').classList.remove('show');
  $('#chg').onclick = e => { // 2回タップで、今の対戦をやめてメニューに戻る
    const b = e.currentTarget;
    if (b.classList.contains('arm')) { location.reload(); return; }
    b.classList.add('arm'); b.textContent = 'もう一度タップ(今の対戦は消えます)';
    clearTimeout(b.t); b.t = setTimeout(() => { b.classList.remove('arm'); b.textContent = '対戦方法を選び直す'; }, 3000);
  };
  $('#list').onclick = e => { const li = e.target.closest('li'); if (li && !cpu) { idx = +li.dataset.i + 1; sync(); pending = null; render(); } };

  // 対戦方法の選択(起動するたびにメニューから選ぶ)
  function startCpu(me, level) {
    cpu = { me, cpu: 1 - me, level, busy: false };
    document.body.classList.add('cpu');
    $('.board').classList.toggle('flip', me === 1); // 自分が常に下側に見えるようにする
    zones[me].classList.remove('top'); zones[me].style.order = 2;
    zones[1 - me].classList.remove('top'); zones[1 - me].classList.add('opp'); zones[1 - me].style.order = 0;
    $('.board').style.order = 1;
    q(me, 'b').textContent = NAMES[me] + '(あなた)';
    q(1 - me, 'b').textContent = NAMES[1 - me] + '(コンピュータ)';
    render(); maybeCpu();
  }
  function start(m) {
    $('#menu').classList.remove('show');
    if (m.m === 'cpu') startCpu(m.me, m.level);
  }
  $('#mTwo').onclick = () => start({ m: 'two' });
  $('#mSide').onclick = e => { const b = e.currentTarget, me = b.dataset.me === '0' ? 1 : 0; b.dataset.me = me; b.textContent = me ? 'あなたの色:白(後手)' : 'あなたの色:黒(先手)'; };
  $$('[data-lv]').forEach(b => b.onclick = () => start({ m: 'cpu', level: +b.dataset.lv, me: +$('#mSide').dataset.me }));
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  render();
  try { localStorage.removeItem('mm-mode'); } catch (e) {}
})();



