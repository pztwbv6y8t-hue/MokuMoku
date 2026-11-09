:root{--wal:#1c1410;--cream:#f6e9cf;--gold:#d9a93f;--red:#d63a2f;--blue:#2f6fd6;--bs:max(240px,min(calc(100vw - 62px),calc(100dvh - 335px - env(safe-area-inset-top) - env(safe-area-inset-bottom)),560px))}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
html,body{margin:0}
body{min-height:100dvh;background:repeating-linear-gradient(95deg,rgba(255,220,170,.03) 0 2px,transparent 2px 9px),radial-gradient(ellipse at 50% 0,#3b2c22,#171110 72%);color:var(--cream);font-family:"Hiragino Sans","Yu Gothic",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));overscroll-behavior:none}
.wrap{display:flex;align-items:center;gap:8px}
.col{width:var(--bs);display:flex;flex-direction:column;gap:8px}
h1{margin:0;writing-mode:vertical-rl;white-space:nowrap;font:700 24px/1 Georgia,"Hiragino Mincho ProN",serif;letter-spacing:.12em;text-shadow:0 2px 0 #000a}
h1 .k{color:var(--gold);font-size:30px;margin-bottom:.35em;text-orientation:upright}
.zone{display:flex;flex-direction:column;gap:6px}
.zone.top{transform:rotate(180deg)}
.pl{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:12px;background:rgba(0,0,0,.3);border:1px solid rgba(217,169,63,.18);transition:.2s}
.pl.on{border-color:var(--gold);box-shadow:0 0 14px rgba(217,169,63,.4)}
.sw{width:16px;height:16px;border-radius:50%;box-shadow:inset 0 -3px 4px #0005,inset 0 2px 3px #fff6}
.pl b{font-size:16px}
.turn{display:none;font-size:12px;padding:2px 8px;border-radius:9px;background:var(--gold);color:var(--wal);font-weight:700}
.pl.on .turn{display:inline}
.pips{margin-left:auto;display:flex;gap:3px}
.pips i{width:6px;height:16px;border-radius:2px;background:#000;box-shadow:0 0 0 1px #ffffff40}
.pips i.off{background:#ffffff14;box-shadow:none}
.pl em{font:700 20px Georgia,serif;font-style:normal;min-width:26px;text-align:right}
.board{position:relative;width:100%;aspect-ratio:1;padding:2.4%;border-radius:16px;background:linear-gradient(135deg,#8a5a30,#573519);box-shadow:0 10px 24px #000a,inset 0 0 0 2px #c9a24e,inset 0 0 0 4px #2f1d0e}
.inner{position:relative;width:100%;height:100%;background:#8a5a2c;touch-action:none;cursor:pointer}
.inner>div>*,.inner>div{pointer-events:none}
#cells>div,.w,.pv,.dot,.pawn{position:absolute}
#cells>div{border-radius:2px;background:repeating-linear-gradient(92deg,rgba(120,70,20,.08) 0 2px,transparent 2px 7px),linear-gradient(145deg,#f6dfa8,#e8c27f)}
.w{border-radius:2px;background:#000;box-shadow:0 0 0 1px rgba(255,255,255,.28),0 2px 4px #000}
.pv{border-radius:2px;opacity:.9;background:#4fd17a;box-shadow:0 0 0 2px #4fd17a88,0 0 10px #4fd17a}
.pv.bad{background:#e0453a;box-shadow:0 0 0 2px #e0453a88,0 0 10px #e0453a}
.dot{display:grid;place-items:center}
.dot::after{content:"";width:38%;height:38%;border-radius:50%;background:radial-gradient(#ffe39a,var(--gold));box-shadow:0 0 8px #d9a93fcc;animation:pu 1.2s ease-in-out infinite}
@keyframes pu{50%{transform:scale(1.25)}}
.pawn{transition:left .18s ease,top .18s ease;z-index:2;filter:drop-shadow(0 2px 2px rgba(0,0,0,.55))}
.pawn svg{width:100%;height:100%;overflow:visible}
.toast{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;padding:9px 16px;border-radius:18px;background:#1b0f08f0;border:1px solid var(--gold);font-size:14px;opacity:0;transition:.2s;pointer-events:none;white-space:nowrap}
.toast.show{opacity:1}
.row{display:grid;gap:6px}
.modes{grid-template-columns:1fr 1fr 1fr 1.1fr}
.acts{grid-template-columns:1fr 1.2fr .8fr 1fr}
.btn{min-height:44px;padding:0 4px;border-radius:12px;border:1px solid rgba(217,169,63,.5);background:linear-gradient(#3d2c22,#241a14);color:var(--cream);font:600 14px inherit;font-family:inherit;box-shadow:0 2px 0 #0008;touch-action:manipulation}
.btn:active{transform:translateY(1px)}
.btn[aria-pressed=true],.btn.gold{background:linear-gradient(#f2c862,#c58f25);color:var(--wal);border-color:#f6dc92}
.btn:disabled{opacity:.35}
.btn.arm{background:linear-gradient(#c8473a,#8e2a20);border-color:#f3a094;color:var(--cream)}
.ov{position:fixed;inset:0;display:none;place-items:center;background:rgba(20,10,5,.82);z-index:9;padding:20px}
.ov.show{display:grid}
.card{width:min(340px,100%);max-height:80dvh;overflow:auto;padding:22px;border-radius:18px;text-align:center;background:linear-gradient(#3b2b21,#211813);border:2px solid var(--gold);box-shadow:0 0 40px #d9a93f55;display:grid;justify-items:center;gap:10px;animation:pop .35s ease}
.card .btn{width:100%}
@keyframes pop{from{transform:scale(.85);opacity:0}}
.card h2{margin:0;font:700 34px Georgia,"Hiragino Mincho ProN",serif}
.card h2.flip{transform:rotate(180deg)}
.card h3{margin:0}
#list{margin:0;padding-left:30px;width:100%;text-align:left;font-size:14px;line-height:1.9}
#list li{cursor:pointer;color:#f6e9cf99}
#list li.done{color:var(--cream)}
#list li.cur{color:var(--gold);font-weight:700}
.zone.opp .row{display:none}
.board.flip .inner{transform:rotate(180deg)}
.board.flip .pawn svg{transform:rotate(180deg)}
body.cpu .card h2.flip{display:none}
.sub{margin:6px 0 0;font-size:13px;opacity:.75}
.lv{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

