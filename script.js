(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const EL = (cls, css) => { const d = document.createElement('div'); if (cls) d.className = cls; if (css) Object.assign(d.style, css); return d; };
  const g = 0.26, P = 1 + g, T = 9 + 8 * g, K = 100 / T; // 盤面を「マス幅=1、溝=g」の単位で扱う
  const NAMES = ['黒', '白'], COL = ['#f6e9cf', '#f6e9cf'], L = 'abcdefghi';
  const MSG = { overlap: '壁が重なっています', cross: '壁が交差しています', block: 'ゴールを塞ぐ壁は置けません', none: '壁がもうありません', range: '置けない場所です' };
  let moves = [], idx = 0, mode = 'move', pending = null, down = null, S = Q.create();
  let net = null, redoBuf = [], busy = false, seq = 0, pass = ''; // ネット対戦用
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

  // ---- ネット対戦(Supabase) ----
  function setMoves(m, mine) { // サーバーの手の履歴を採用
    if (JSON.stringify(m) === JSON.stringify(moves)) return;
    let s; try { s = Q.replay(m); } catch (e) { toast('データが不正です'); return; }
    if (!mine) redoBuf = [];
    moves = m; idx = m.length; S = s; pending = null; mode = 'move'; render();
  }
  async function push(nm) {
    if (busy) return false; busy = true;
    try {
      const { data: d, error } = await net.sb.rpc('submit_moves', { expected_len: moves.length, new_moves: nm, pass });
      if (error || !d) { toast('通信エラー'); return false; }
      if (d.err === 'pass') { localStorage.removeItem('qd-pass'); toast('合言葉が違います'); return false; }
      if (!d.ok) { toast('相手が先に操作しました'); redoBuf = []; }
      setMoves(d.moves, d.ok);
      return d.ok;
    } catch (e) { toast('通信エラー'); return false; } finally { busy = false; seq++; }
  }
  async function startNet(me) {
    if (!window.supabase || !window.QD_CONFIG || /YOUR/.test(QD_CONFIG.url + QD_CONFIG.key)) { alert('ネット対戦には config.js の設定が必要です(または通信できません)'); return false; }
    pass = localStorage.getItem('qd-pass') || prompt('合言葉を入力してください') || '';
    if (!pass) return false;
    localStorage.setItem('qd-pass', pass);
    const sb = supabase.createClient(QD_CONFIG.url, QD_CONFIG.key);
    net = { me, sb };
    document.body.classList.add('online');
    $('.board').classList.toggle('flip', me === 1); // 白は自分が下側に見えるよう盤面を回す
    zones[me].classList.remove('top'); zones[me].style.order = 2;
    zones[1 - me].classList.remove('top'); zones[1 - me].classList.add('opp'); zones[1 - me].style.order = 0;
    $('.board').style.order = 1;
    q(me, 'b').textContent = NAMES[me] + '(あなた)';
    const pull = async () => {
      if (busy) return; const s0 = seq;
      const { data } = await sb.from('quoridor_game').select('moves').eq('id', 1).single();
      if (data && s0 === seq && !busy) setMoves(data.moves, false);
    };
    await pull();
    setInterval(pull, 2500);
    document.addEventListener('visibilitychange', pull);
    sb.channel('qd').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quoridor_game' }, p => { if (!busy) setMoves(p.new.moves, false); }).subscribe();
    return true;
  }

  // ---- 操作 ----
  function commit(m) {
    if (net) { redoBuf = []; push([...moves, m]); return; }
    moves.length = idx; moves.push(m); idx++; sync(); pending = null; mode = 'move'; render();
  }
  const undo = () => {
    if (net) { if (!moves.length) return; const last = moves[moves.length - 1]; push(moves.slice(0, -1)).then(ok => { if (ok) redoBuf.push(last); render(); }); return; }
    if (idx > 0) { idx--; sync(); pending = null; mode = 'move'; render(); }
  };
  const redo = () => {
    if (net) { if (!redoBuf.length) return; const m = redoBuf[redoBuf.length - 1]; push([...moves, m]).then(ok => { if (ok) redoBuf.pop(); render(); }); return; }
    if (idx < moves.length) { idx++; sync(); pending = null; render(); }
  };
  const restart = () => {
    if (net) { redoBuf = []; push([]); return; }
    moves = []; idx = 0; pending = null; mode = 'move'; sync(); render();
  };
  function place() {
    if (!pending) return;
    const e = Q.wallError(S, pending.o, pending.r, pending.c);
    if (e) { toast(MSG[e]); return; }
    commit({ p: S.turn, t: 'w', o: pending.o, r: pending.r, c: pending.c });
  }

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
      q(p, '.bRedo').disabled = net ? !redoBuf.length : idx === moves.length;
    });
    const W = $('#walls'); W.innerHTML = '';
    moves.slice(0, idx).filter(m => m.t === 'w').forEach(m => W.appendChild(EL('w ' + m.o, wallBox(m.o, m.r, m.c))));
    const D = $('#dots'); D.innerHTML = '';
    const myTurn = !net || net.me === S.turn;
    if (mode === 'move' && !over && myTurn) Q.legalMoves(S).forEach(([r, c]) => D.appendChild(EL('dot', { left: pct(c * P), top: pct(r * P), width: pct(1), height: pct(1) })));
    const pv = $('#pv');
    pv.hidden = !pending;
    if (pending) { Object.assign(pv.style, wallBox(pending.o, pending.r, pending.c)); pv.classList.toggle('bad', !!err); }
    $('#list').innerHTML = moves.length ? moves.map((m, i) => `<li data-i="${i}" class="${i < idx ? 'done' : ''} ${i === idx - 1 ? 'cur' : ''}">${fmt(m)}</li>`).join('') : '<p>まだ手がありません</p>';
    $('#win').classList.toggle('show', over);
    if (over) for (const id of ['#winText', '#winText2']) { $(id).textContent = NAMES[S.win] + 'の勝利'; $(id).style.color = COL[S.win]; }
  }

  // 盤面入力(座標から計算するので、縦壁・横壁どちらも確実に選べる)
  const xy = e => {
    const b = inner.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * T, y = (e.clientY - b.top) / b.height * T;
    return net && net.me === 1 ? [T - x, T - y] : [x, y]; // 白は盤面が180度回っている
  };
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const slot = (x, y) => ({ c: cl(Math.round((x + g / 2) / P - 1), 0, 7), r: cl(Math.round((y + g / 2) / P - 1), 0, 7), o: mode });
  const same = (a, b) => a && b && a.r === b.r && a.c === b.c && a.o === b.o;
  inner.addEventListener('pointerdown', e => {
    if (S.win >= 0 || busy || (net && net.me !== S.turn)) return;
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

  // ボタン
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
  $('#chg').onclick = () => { localStorage.removeItem('qd-mode'); location.reload(); };
  $('#list').onclick = e => { const li = e.target.closest('li'); if (li && !net) { idx = +li.dataset.i + 1; sync(); pending = null; render(); } };

  // 起動時のモード選択
  function start(m) {
    localStorage.setItem('qd-mode', m); $('#menu').classList.remove('show');
    if (m === 'local') return;
    startNet(+m).then(ok => { if (!ok) { localStorage.removeItem('qd-mode'); $('#menu').classList.add('show'); } });
  }
  $('#mLocal').onclick = () => start('local');
  $('#mRed').onclick = () => start('0');
  $('#mBlue').onclick = () => start('1');
  const saved = localStorage.getItem('qd-mode');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  render();
  if (saved) start(saved);
})();


