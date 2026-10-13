(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const root = $('#game'); if (!root) return;
  const cv = $('#gcv'), cx = cv.getContext('2d'), stage = $('.gstage'), wrap = $('.gwrap');
  const MAZE = ["###################", "#o.......#.......o#", "#.###.##.#.##.###.#", "#.................#", "#.##.#.#####.#.##.#", "#....#...#...#....#", "####.##.....##.####", "#.......GGG.......#", "####.##.....##.####", "#....#...#...#....#", "#.##.#.#####.#.##.#", "#........P........#", "#.###.##.#.##.###.#", "#o.......#.......o#", "###################"];
  const W = 19, H = 15, DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]], HOME = [9, 7];
  const CORNERS = [[17, 1], [1, 1], [1, 13], [17, 13]];
  const GS = [[8, 7], [10, 7], [9, 7], [7, 7]], DELAY = [0, 2.5, 5, 7.5], GLYPH = ['AD', 'BR', 'CH', 'VS'];
  const LV = [
    { name: 'Awareness', n: 2, gs: 4.6, fr: 8, fact: "The North Coast Courier: monthly active users grew from 8,400 to 23,600 in 18 months, a 182% rise, through SEO, content repurposing and paid acquisition." },
    { name: 'Consideration', n: 3, gs: 5.0, fr: 7, fact: "MiX Telematics: one LinkedIn content strategy earned 650,000 organic impressions in a single month, a 12x ROI against paid media spend." },
    { name: 'Conversion', n: 4, gs: 5.4, fr: 6, fact: "CBR Marketing Solutions: R4.3 million a month in paid media managed at an average ROAS of 4.2:1, with 18% month-on-month efficiency gains." },
    { name: 'Loyalty', n: 4, gs: 5.8, fr: 5, fact: "Gagasi Heart Media Group: ran Mailchimp and Everlytic email programmes and built the dashboards that tracked marketing ROI across two radio brands." }
  ];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let grid, dots, homeD, ts = 32, dpr = 1, state = 'idle', lvl = 0, score = 0, lives = 3, best = 0;
  let player, ghosts = [], fright = 0, combo = 0, clock = 0, last = 0, walls, soundOn = false, ac, mode = 'scatter', modeT = 0, deadT = 0, opener, raf, tx0, ty0;
  try { best = +localStorage.getItem('fr_best') || 0; } catch (e) {}

  const track = (n, p) => { try { window.gtag && window.gtag('event', n, p || {}); } catch (e) {} };
  const free = (x, y) => x >= 0 && x < W && y >= 0 && y < H && grid[y][x] !== '#';
  const pos = e => [e.x + e.dx * e.p, e.y + e.dy * e.p];
  function blip(f, d) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = .03; o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + d);
    } catch (e) {}
  }
  function hud() {
    $('#gscore').textContent = score; $('#gbest').textContent = best;
    $('#glives').textContent = '\u2665'.repeat(Math.max(lives, 0));
    $('#glevel').textContent = 'Level ' + (lvl + 1) + ' \u00b7 ' + LV[lvl].name;
  }
  function addScore(n) {
    score += n;
    if (score > best) { best = score; try { localStorage.setItem('fr_best', best); } catch (e) {} }
    hud();
  }
  function msg(h, p, b1, f1, b2, f2) {
    $('#gmh').textContent = h; $('#gmp').textContent = p;
    const a = $('#gmb'), b = $('#gm2');
    a.textContent = b1; a.onclick = f1;
    if (b2) { b.hidden = false; b.textContent = b2; b.onclick = f2; } else b.hidden = true;
    $('#gmsg').hidden = false; a.focus();
  }
  const hideMsg = () => { $('#gmsg').hidden = true; };

  function load() {
    grid = MAZE.map(r => [...r]); dots = 0;
    grid.forEach((r, y) => r.forEach((c, x) => {
      if (c === '.' || c === 'o') dots++;
      if (c === 'P' || c === 'G') grid[y][x] = ' ';
    }));
    homeD = grid.map(r => r.map(() => 999));
    const q = [HOME]; homeD[HOME[1]][HOME[0]] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1];
        if (free(nx, ny) && homeD[ny][nx] === 999) { homeD[ny][nx] = homeD[y][x] + 1; q.push([nx, ny]); }
      }
    }
  }
  function spawn() {
    player = { x: 9, y: 11, dx: 0, dy: 0, p: 0, speed: 6.2, want: null, face: [1, 0] };
    ghosts = [];
    for (let i = 0; i < LV[lvl].n; i++) ghosts.push({ id: i, x: GS[i][0], y: GS[i][1], dx: 0, dy: 0, p: 0, speed: LV[lvl].gs, wait: true, eaten: false });
    clock = 0; fright = 0; mode = 'scatter'; modeT = 0;
  }

  function move(e, dt, pick) {
    let d = e.speed * dt;
    while (d > 0) {
      if (!e.dx && !e.dy) { pick(e); if (!e.dx && !e.dy) return; }
      const need = 1 - e.p;
      if (d < need) { e.p += d; return; }
      d -= need; e.x += e.dx; e.y += e.dy; e.p = 0;
      pick(e);
      if (!e.dx && !e.dy) return;
    }
  }
  function pickP(e) {
    const c = grid[e.y][e.x];
    if (c === '.') { grid[e.y][e.x] = ' '; dots--; addScore(10); blip(480, .03); }
    else if (c === 'o') {
      grid[e.y][e.x] = ' '; dots--; addScore(50); fright = LV[lvl].fr; combo = 0; blip(220, .15);
      ghosts.forEach(g => { if (!g.eaten && !g.wait) reverse(g); });
    }
    const w = e.want;
    if (w && free(e.x + w[0], e.y + w[1])) { e.dx = w[0]; e.dy = w[1]; e.face = w; }
    else if (!(e.dx || e.dy) || !free(e.x + e.dx, e.y + e.dy)) { e.dx = 0; e.dy = 0; }
  }
  function reverse(g) {
    if (!g.dx && !g.dy) return;
    if (g.p > 0) { g.x += g.dx; g.y += g.dy; g.p = 1 - g.p; }
    g.dx = -g.dx; g.dy = -g.dy;
  }
  function target(g) {
    if (mode === 'scatter') return CORNERS[g.id];
    const p = player;
    if (g.id === 0) return [p.x, p.y];
    if (g.id === 1) return [p.x + p.dx * 4, p.y + p.dy * 4];
    if (g.id === 2) return Math.random() < .3 ? [Math.random() * W | 0, Math.random() * H | 0] : [p.x, p.y];
    return Math.hypot(p.x - g.x, p.y - g.y) > 6 ? [p.x, p.y] : CORNERS[3];
  }
  function pickG(g) {
    const opts = DIRS.filter(d => free(g.x + d[0], g.y + d[1]) && !((g.dx || g.dy) && d[0] === -g.dx && d[1] === -g.dy));
    if (!opts.length) { g.dx = -g.dx; g.dy = -g.dy; return; }
    let b;
    if (g.eaten) b = opts.reduce((a, c) => homeD[g.y + c[1]][g.x + c[0]] < homeD[g.y + a[1]][g.x + a[0]] ? c : a);
    else if (fright > 0) b = opts[Math.random() * opts.length | 0];
    else {
      const [tx, ty] = target(g), dd = d => (g.x + d[0] - tx) ** 2 + (g.y + d[1] - ty) ** 2;
      b = opts.reduce((a, c) => dd(c) < dd(a) ? c : a);
    }
    g.dx = b[0]; g.dy = b[1];
  }

  function update(dt) {
    clock += dt; modeT += dt;
    if (mode === 'scatter' && modeT > 5) { mode = 'chase'; modeT = 0; }
    else if (mode === 'chase' && modeT > 16) { mode = 'scatter'; modeT = 0; }
    if (fright > 0) fright -= dt;
    move(player, dt, pickP);
    for (const g of ghosts) {
      if (g.wait) { if (clock >= DELAY[g.id]) g.wait = false; continue; }
      g.speed = g.eaten ? 10 : (fright > 0 ? 3.2 : LV[lvl].gs);
      move(g, dt, pickG);
      if (g.eaten) { const q = pos(g); if (Math.abs(q[0] - HOME[0]) + Math.abs(q[1] - HOME[1]) < .3) g.eaten = false; }
    }
    const pp = pos(player);
    for (const g of ghosts) {
      if (g.wait || g.eaten) continue;
      const gp = pos(g);
      if (Math.hypot(pp[0] - gp[0], pp[1] - gp[1]) < .6) {
        if (fright > 0) { g.eaten = true; combo++; addScore(200 * Math.pow(2, combo - 1)); blip(700, .1); }
        else { die(); return; }
      }
    }
    if (dots <= 0) stageClear();
  }
  function die() {
    lives--; state = 'dying'; deadT = 1.1; blip(110, .5); hud();
  }
  function afterDeath() {
    if (lives <= 0) {
      state = 'over'; track('game_over', { score: score, stage: LV[lvl].name });
      msg('Game over', 'You scored ' + score + '. Best: ' + best + '. Every campaign loses a few leads along the way. Another go?', 'Play again', startGame, 'Close', close);
    } else { spawn(); state = 'playing'; }
  }
  function stageClear() {
    state = 'card'; track('game_stage_clear', { stage: LV[lvl].name });
    if (lvl < LV.length - 1) {
      msg('Stage cleared: ' + LV[lvl].name, LV[lvl].fact, 'Next stage', () => { lvl++; startLevel(); }, null);
    } else {
      track('game_win', { score: score });
      msg('You converted!', 'Final score ' + score + '. ' + LV[lvl].fact + ' Those are real results from real campaigns. Want them for your brand?', "Let's talk", () => { close(); location.hash = '#contact'; }, 'Play again', startGame);
    }
  }
  function startLevel() { load(); spawn(); hud(); hideMsg(); state = 'playing'; }
  function startGame() { score = 0; lives = 3; lvl = 0; track('game_start'); startLevel(); }
  function pause() { if (state !== 'playing') return; state = 'paused'; msg('Paused', 'Take a breath. The funnel will wait.', 'Resume', resume, 'Quit', close); }
  function resume() { if (state !== 'paused') return; hideMsg(); state = 'playing'; }

  /* ---------- drawing ---------- */
  function resize() {
    wrap.style.maxWidth = Math.min(760, Math.max(280, (innerHeight - 190) * W / H)) + 'px';
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = stage.clientWidth || 600; ts = w / W;
    cv.width = w * dpr; cv.height = ts * H * dpr; cv.style.height = ts * H + 'px';
    walls = document.createElement('canvas'); walls.width = cv.width; walls.height = cv.height;
    const c = walls.getContext('2d'); c.scale(dpr, dpr);
    c.strokeStyle = '#ff3040'; c.lineWidth = Math.max(1.5, ts * .06); c.lineCap = 'round'; c.shadowColor = '#ff3040'; c.shadowBlur = 6;
    const isW = (x, y) => x < 0 || x >= W || y < 0 || y >= H || MAZE[y][x] === '#';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (MAZE[y][x] !== '#') continue;
      c.fillStyle = 'rgba(255,48,64,.06)'; c.fillRect(x * ts, y * ts, ts, ts);
      const E = [[0, -1, x, y, x + 1, y], [-1, 0, x, y, x, y + 1], [0, 1, x, y + 1, x + 1, y + 1], [1, 0, x + 1, y, x + 1, y + 1]];
      for (const [dx, dy, a, b, cc, d] of E) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H && !isW(nx, ny)) { c.beginPath(); c.moveTo(a * ts, b * ts); c.lineTo(cc * ts, d * ts); c.stroke(); }
      }
    }
  }
  function rr(x, y, w, h, r) {
    cx.beginPath();
    if (cx.roundRect) cx.roundRect(x, y, w, h, r); else cx.rect(x, y, w, h);
  }
  function draw() {
    if (!grid) return;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W * ts, H * ts);
    cx.drawImage(walls, 0, 0, W * ts, H * ts);
    const pulse = reduce ? 1 : .75 + .25 * Math.sin(performance.now() / 160);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (c === '.') { cx.fillStyle = 'rgba(255,255,255,.85)'; cx.beginPath(); cx.arc((x + .5) * ts, (y + .5) * ts, ts * .09, 0, 7); cx.fill(); }
      else if (c === 'o') { cx.fillStyle = '#ff3040'; cx.shadowColor = '#ff3040'; cx.shadowBlur = 10; cx.beginPath(); cx.arc((x + .5) * ts, (y + .5) * ts, ts * .24 * pulse, 0, 7); cx.fill(); cx.shadowBlur = 0; }
    }
    for (const g of ghosts) drawGhost(g);
    if (state !== 'dying' || Math.floor(deadT * 8) % 2) drawPlayer();
  }
  function drawPlayer() {
    const [x, y] = pos(player), f = player.face;
    cx.save(); cx.translate((x + .5) * ts, (y + .5) * ts); cx.rotate(Math.atan2(f[1], f[0]));
    const r = ts * .4;
    cx.fillStyle = '#ff3040'; cx.shadowColor = '#ff3040'; cx.shadowBlur = 12; cx.lineJoin = 'round'; cx.strokeStyle = '#ff3040'; cx.lineWidth = ts * .08;
    cx.beginPath(); cx.moveTo(r, 0); cx.lineTo(-r * .8, r * .8); cx.lineTo(-r * .3, 0); cx.lineTo(-r * .8, -r * .8); cx.closePath(); cx.fill(); cx.stroke();
    cx.restore();
  }
  function drawGhost(g) {
    const [x, y] = pos(g), bob = g.wait && !reduce ? Math.sin(performance.now() / 200 + g.id) * ts * .05 : 0;
    const cxp = (x + .5) * ts, cyp = (y + .5) * ts + bob, s = ts * .76;
    if (g.eaten) {
      cx.fillStyle = '#fff';
      for (const o of [-.14, .14]) { cx.beginPath(); cx.arc(cxp + o * ts, cyp, ts * .07, 0, 7); cx.fill(); }
      return;
    }
    const scared = fright > 0, blink = scared && fright < 2 && !reduce && Math.floor(fright * 6) % 2;
    cx.fillStyle = scared ? (blink ? '#fff' : '#ff3040') : '#f4f4f4';
    cx.shadowColor = scared ? '#ff3040' : '#fff'; cx.shadowBlur = 8;
    rr(cxp - s / 2, cyp - s / 2, s, s, ts * .18); cx.fill(); cx.shadowBlur = 0;
    cx.fillStyle = scared && !blink ? '#fff' : '#000'; cx.font = '700 ' + Math.round(ts * .34) + 'px ui-monospace, Menlo, monospace';
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(scared ? ':(' : GLYPH[g.id], cxp, cyp + 1);
  }

  /* ---------- loop, input, open/close ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (state === 'playing') update(dt);
    else if (state === 'dying') { deadT -= dt; if (deadT <= 0) afterDeath(); }
    draw();
  }
  const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowDown: [0, 1], s: [0, 1], ArrowRight: [1, 0], d: [1, 0] };
  function setWant(d) {
    if (state !== 'playing' || !player) return;
    const p = player; p.want = d;
    if ((p.dx || p.dy) && d[0] === -p.dx && d[1] === -p.dy && p.p > 0) { p.x += p.dx; p.y += p.dy; p.p = 1 - p.p; p.dx = -p.dx; p.dy = -p.dy; p.face = d; }
  }
  document.addEventListener('keydown', e => {
    if (root.hidden) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYS[k]) { e.preventDefault(); setWant(KEYS[k]); }
    else if (k === 'p') { state === 'paused' ? resume() : pause(); }
    else if (k === 'Escape') close();
  });
  cv.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  cv.addEventListener('touchend', e => {
    const t = e.changedTouches[0], dx = t.clientX - tx0, dy = t.clientY - ty0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    setWant(Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 1 : -1, 0] : [0, dy > 0 ? 1 : -1]);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('resize', () => { if (!root.hidden) resize(); });
  $('#gpause').onclick = () => { state === 'paused' ? resume() : pause(); };
  $('#gclose').onclick = () => close();
  $('#gsound').onclick = e => { soundOn = !soundOn; e.currentTarget.textContent = soundOn ? 'Sound on' : 'Sound off'; e.currentTarget.setAttribute('aria-pressed', soundOn); };
  function close() {
    cancelAnimationFrame(raf); root.hidden = true; document.documentElement.style.overflow = ''; state = 'idle';
    if (opener && opener.focus) opener.focus();
  }
  window.openGame = function () {
    opener = document.activeElement; root.hidden = false; document.documentElement.style.overflow = 'hidden';
    resize(); lvl = 0; load(); spawn(); hud(); track('game_open');
    msg('Funnel Run', 'Eat every lead. Dodge the four things that kill campaigns: the Ad Blocker, Bounce Rate, Churn and the Competitor. Grab a red boost to convert them. Clear four funnel stages to unlock the results behind them.', 'Start', startGame, null);
    last = performance.now(); raf = requestAnimationFrame(frame);
  };
  ['#playbtn', '#playhero'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', window.openGame); });
})();
