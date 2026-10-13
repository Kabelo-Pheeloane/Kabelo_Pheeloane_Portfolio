const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hover = matchMedia('(hover: hover)').matches;
const hoverOK = hover;

/* Theme toggle (remembers the choice) */
const root = document.documentElement, tb = $('#theme');
function setTheme(t) {
  root.dataset.theme = t;
  tb.textContent = t === 'dark' ? 'Light' : 'Dark';
  tb.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' theme');
  $('meta[name=theme-color]').content = t === 'dark' ? '#050505' : '#ffffff';
  if (window.glDark) window.glDark(t === 'dark');
}
setTheme(root.dataset.theme);
function toggleTheme() {
  const flip = () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  };
  if (!document.startViewTransition || reduce) { flip(); return; }
  const r = tb.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(flip).ready.then(() => root.animate(
    { clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
    { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }));
}
tb.onclick = toggleTheme;

/* Johannesburg clock and year */
const clock = () => {
  $('#time').textContent = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Johannesburg'
  }).format(new Date());
};
clock(); setInterval(clock, 30000);
$('#year').textContent = new Date().getFullYear();

/* Scroll progress bar */
const prog = $('#progress');
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  prog.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
}, { passive: true });

/* Hero: rotating words, cursor glow, name weight follows the pointer */
const words = ['attention', 'content', 'audiences', 'data', 'ideas'];
const swap = $('#swap');
if (!reduce) {
  let i = 0;
  setInterval(() => {
    swap.classList.add('out');
    setTimeout(() => { i = (i + 1) % words.length; swap.textContent = words[i]; swap.classList.remove('out'); }, 260);
  }, 2400);
}
const hero = $('.hero');
if (hover && !reduce) {
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    hero.style.setProperty('--mx', x * 100 + '%');
    hero.style.setProperty('--my', y * 100 + '%');
  });
}

/* Marquee: duplicate the track so the loop is seamless */
const track = $('#track');
track.innerHTML += track.innerHTML;

/* Scroll reveal and count-up numbers */
function count(el) {
  const n = +el.dataset.count, d = +el.dataset.dec || 0;
  if (reduce) { el.textContent = n.toFixed(d); return; }
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = (n * (1 - Math.pow(1 - p, 3))).toFixed(d);
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  if (e.target.dataset.count) count(e.target);
  io.unobserve(e.target);
}), { threshold: 0.25 });
$$('[data-reveal], [data-count]').forEach(el => io.observe(el));

/* Magnetic email link */
const mail = $('.mail');
if (hover && !reduce) {
  mail.addEventListener('pointermove', e => {
    const r = mail.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.08;
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.2;
    mail.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  mail.addEventListener('pointerleave', () => { mail.style.transform = ''; });
}

/* Writing: built from posts.js, with topic filters and live search */
const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
const topics = ['All', ...new Set(posts.map(p => p.topic))];
const fmt = d => new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(new Date(d));
let topic = 'All', query = '';

function draw() {
  const list = posts.filter(p =>
    (topic === 'All' || p.topic === topic) &&
    (p.title + ' ' + p.excerpt + ' ' + p.topic).toLowerCase().includes(query));
  $('#posts').innerHTML = list.map(p =>
    '<li><a href="' + p.url + '"><time datetime="' + p.date + '">' + fmt(p.date) + '</time>' +
    '<h3>' + p.title + '</h3><p>' + p.excerpt +
    '<span class="meta">' + p.topic + ' &middot; ' + p.read + ' min read</span></p></a></li>').join('');
  $('#empty').hidden = list.length > 0;
}
const chips = $('#chips');
chips.innerHTML = topics.map(t =>
  '<button class="chip" type="button" aria-pressed="' + (t === 'All') + '">' + t + '</button>').join('');
chips.addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  topic = b.textContent;
  $$('.chip').forEach(c => c.setAttribute('aria-pressed', c === b));
  draw();
});
$('#q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); draw(); });
draw();

/* Name: every letter is its own element and thins out near the cursor */
$$('.name .line').forEach((line, li) => {
  const text = line.textContent; line.textContent = '';
  [...text].forEach((c, i) => {
    const s = document.createElement('span');
    s.className = 'ch' + (c === '.' ? ' dot' : '');
    s.textContent = c;
    s.style.setProperty('--i', i + li * 5);
    line.appendChild(s);
  });
});
const letters = $$('.name .ch');
if (hover && !reduce) {
  let raf;
  hero.addEventListener('pointermove', e => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => letters.forEach(c => {
      const r = c.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      const k = Math.exp(-Math.pow(d / (innerWidth * 0.12), 2));
      c.style.fontVariationSettings = '"wght" ' + Math.round(600 - 200 * k);
    }));
  });
  hero.addEventListener('pointerleave', () => letters.forEach(c => { c.style.fontVariationSettings = ''; }));
}

/* Command menu: Ctrl/Cmd+K */
(function () {
  const cmd = $('#cmd'), cq = $('#cmdq'), cl = $('#cmdl');
  $('#kkey').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '\u2318 K' : 'Ctrl K';
  const items = [['Approach', '#funnel'], ['Work', '#work'], ['Writing', '#writing'], ['About', '#about'], ['Contact', '#contact'],
    ['Download CV', () => { const l = document.createElement('a'); l.href = 'Kabelo_Pheeloane_CV.pdf'; l.download = ''; l.click(); }],
    ['Email Kabelo', () => { location.href = 'mailto:kabelo.p.pheeloane@gmail.com'; }],
    ['Play Funnel Run', () => window.openGame && window.openGame()],
    ['Toggle theme', () => toggleTheme()]];
  let sel = 0, shown = items;
  const draw = () => { cl.innerHTML = shown.map((x, i) => '<li role="option" aria-selected="' + (i === sel) + '" data-i="' + i + '">' + x[0] + '</li>').join(''); };
  const run = i => { const x = shown[i]; if (!x) return; cmd.close(); typeof x[1] === 'function' ? x[1]() : (location.hash = x[1]); };
  const open = () => { cq.value = ''; shown = items; sel = 0; draw(); cmd.showModal(); cq.focus(); };
  $('#kbtn').onclick = open;
  addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmd.open ? cmd.close() : open(); } });
  cq.oninput = () => { const v = cq.value.toLowerCase(); shown = items.filter(x => x[0].toLowerCase().includes(v)); sel = 0; draw(); };
  cq.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') run(sel);
  };
  cl.onclick = e => { const li = e.target.closest('li'); if (li) run(+li.dataset.i); };
  cmd.addEventListener('click', e => { if (e.target === cmd) cmd.close(); });
})();

/* 3D tilt on the portrait */
(function () {
  const pt = $('.portrait'); if (!pt || !hover || reduce) return;
  pt.addEventListener('pointermove', e => {
    const r = pt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    pt.style.transform = 'perspective(700px) rotateY(' + x * 14 + 'deg) rotateX(' + -y * 14 + 'deg)';
  });
  pt.addEventListener('pointerleave', () => { pt.style.transform = ''; });
})();

/* Employer logos: files in /logos appear in the scrolling strip and beside each role */
(function () {
  const EXT = 'png'; // change to 'svg' if your logo files are SVGs
  const track = $('#logoTrack'); if (!track) return;
  const mk = (slug, name, cls) => { const i = new Image(); i.src = 'logos/' + slug + '.' + EXT; i.alt = name; i.loading = 'lazy'; i.className = cls; return i; };
  const list = [];
  $$('.work details[data-logo]').forEach(d => {
    const s = d.querySelector('summary > span'), slug = d.dataset.logo, name = s.firstChild.textContent.trim();
    list.push([slug, name]);
    const w = document.createElement('span'); w.className = 'role-text';
    while (s.firstChild) w.appendChild(s.firstChild);
    const img = mk(slug, name, 'role-logo'); img.onerror = () => img.remove();
    s.append(img, w);
  });
  const build = dup => list.map(([slug, name]) => {
    const it = document.createElement('span'); it.className = 'logo-item' + (dup ? ' dup' : '');
    if (dup) it.setAttribute('aria-hidden', 'true');
    const img = mk(slug, dup ? '' : name, '');
    img.onerror = () => { const b = document.createElement('b'); b.textContent = name; img.replaceWith(b); };
    it.appendChild(img); return it;
  });
  track.append(...build(false), ...build(true));
})();

/* Typewriter roles and live Johannesburg time with seconds */
(function () {
  const el = $('#typed'), t2 = $('#time2');
  if (t2) {
    const f = () => { t2.textContent = new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Africa/Johannesburg' }).format(new Date()); };
    f(); setInterval(f, 1000);
  }
  if (!el || reduce) return;
  const roles = ['Senior Digital Marketing Leader', 'Paid Media Strategist', 'AI and Marketing Automation', 'Content and Growth Lead'];
  let i = 0, j = roles[0].length, del = true;
  (function tick() {
    const w = roles[i]; el.textContent = w.slice(0, j);
    if (!del && j === w.length) { del = true; return setTimeout(tick, 1800); }
    if (del && j === 0) { del = false; i = (i + 1) % roles.length; }
    j += del ? -1 : 1;
    setTimeout(tick, del ? 28 : 55);
  })();
})();

/* Signal through noise: static resolves into one clean line; the dial retunes it */
(function () {
  const cv = $('#sig'), sk = $('.skyline'); if (!cv || !sk) return;
  const cx = cv.getContext('2d'), nc = document.createElement('canvas'), nx = nc.getContext('2d');
  let W, H, img, mx = -1e3, my = -1e3, vis = true, freq = 1, ft = 1, bt = -1e9;
  const size = () => {
    const d = Math.min(devicePixelRatio, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
    nc.width = Math.ceil(W / 3); nc.height = Math.ceil(H / 3); img = nx.createImageData(nc.width, nc.height);
  };
  addEventListener('resize', size); size();
  addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  window.tuneSignal = f => { ft = f; bt = performance.now(); };
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(cv);
  const t0 = performance.now(), L = 7;
  (function frame(now) {
    requestAnimationFrame(frame);
    if (!vis || document.hidden) return;
    const t = (now - t0) / 1000, dark = root.dataset.theme === 'dark', ink = dark ? '255,255,255' : '0,0,0', acc = dark ? '255,48,64' : '215,20,31';
    const boot = reduce ? 0 : Math.pow(1 - Math.min(t / 3.2, 1), 2);
    const burst = reduce ? 0 : Math.max(0, 1 - (now - bt) / 900) * .7;
    const n = Math.max(boot, burst);
    freq += (ft - freq) * .06;
    cx.clearRect(0, 0, W, H);
    const dd = img.data, c = dark ? 255 : 0, a = n * 90 + 10;
    for (let i = 0; i < dd.length; i += 4) { if (Math.random() < .5) { dd[i] = dd[i + 1] = dd[i + 2] = c; dd[i + 3] = a * Math.random(); } else dd[i + 3] = 0; }
    nx.putImageData(img, 0, 0); cx.imageSmoothingEnabled = false; cx.drawImage(nc, 0, 0, W, H);
    const sr = sk.getBoundingClientRect(), cr = cv.getBoundingClientRect();
    const y0 = sr.top - cr.top + sr.height * .4, A = Math.min(H * .1, 64);
    for (let k = L - 1; k >= 0; k--) {
      const main = k === 0;
      cx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const g = Math.exp(-Math.pow((x - mx) / 180, 2)) * Math.exp(-Math.pow((y0 - my) / 300, 2));
        let y = Math.sin(x * .011 * freq + t * 1.3) * A * .5 + Math.sin(x * .029 * freq - t * .9) * A * .16;
        y *= 1 + 1.1 * g;
        if (!main) y += (Math.sin(x * .05 * k + t * (2 + k) + k * 5) * Math.sin(x * .013 - k * 2 + t * 1.7) * A * 1.3 + (Math.random() - .5) * A * .5) * n;
        else y += (Math.random() - .5) * A * .35 * n;
        x ? cx.lineTo(x, y0 + y) : cx.moveTo(x, y0 + y);
      }
      cx.strokeStyle = main ? 'rgba(' + acc + ',1)' : 'rgba(' + ink + ',' + .35 * n + ')';
      cx.lineWidth = main ? 1.6 : 1; cx.stroke();
    }
  })(t0);
})();

/* Radio dial navigation */
(function () {
  const d = $('.dial'); if (!d) return;
  const links = $$('a', d), secs = links.map(l => $(l.getAttribute('href')));
  const set = a => { links.forEach(l => l.classList.toggle('on', l === a)); d.style.setProperty('--nx', (a.offsetLeft + a.offsetWidth / 2 - 1) + 'px'); };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const l = links[secs.indexOf(e.target)]; set(l); window.tuneSignal && window.tuneSignal(+l.dataset.f);
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => s && io.observe(s));
  links.forEach(l => l.addEventListener('mouseenter', () => window.tuneSignal && window.tuneSignal(+l.dataset.f)));
  addEventListener('resize', () => { const a = $('.on', d); if (a) set(a); });
  document.fonts && document.fonts.ready.then(() => set($('.on', d) || links[0]));
  set(links[0]);
})();
