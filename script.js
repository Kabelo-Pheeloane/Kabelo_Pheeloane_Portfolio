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
  $('meta[name=theme-color]').content = t === 'dark' ? '#000000' : '#ffffff';
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

/* WebGL hero: flowing marble with contour lines that bends around the cursor */
(function () {
  const cv = $('#gl'); if (!cv) return;
  const gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { cv.remove(); return; }
  const fs = `precision highp float;uniform vec2 r,m;uniform float t,dark;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r,p=(gl_FragCoord.xy-.5*r)/r.y,mm=(m*r-.5*r)/r.y;
  float d=length(p-mm); p+=.25*exp(-d*3.)*(p-mm);
  vec2 q=vec2(fbm(p*1.6+t*.04),fbm(p*1.6+vec2(5.2,1.3)-t*.03));
  float f=fbm(p*1.8+2.6*q+t*.02);
  vec3 base=vec3(1.-dark);
  vec3 fog=vec3(mix(.74,.34,dark));
  vec3 c=mix(base,fog,smoothstep(.25,.85,f)*mix(.7,.6,dark));
  c+=exp(-d*4.)*mix(-.05,.10,dark);
  c+=(h(gl_FragCoord.xy+fract(t)*91.)-.5)*mix(.05,.07,dark);
  gl_FragColor=vec4(mix(base,c,smoothstep(0.,.35,uv.y)),1.);}`;
  const sh = (ty, src) => { const o = gl.createShader(ty); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pg = gl.createProgram();
  gl.attachShader(pg, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}'));
  gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pg);
  if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) { cv.remove(); return; }
  root.classList.add('has-gl'); gl.useProgram(pg);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = k => gl.getUniformLocation(pg, k), ur = U('r'), ut = U('t'), um = U('m'), ud = U('dark');
  let dark = root.dataset.theme === 'dark' ? 1 : 0, dk = dark, tx = .5, ty = .5, mx = .5, my = .5, vis = true;
  window.glDark = d => { dark = d ? 1 : 0; };
  const size = () => { const k = Math.min(devicePixelRatio, 1.5) * .6; cv.width = cv.clientWidth * k; cv.height = cv.clientHeight * k; gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener('resize', size); size();
  addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; });
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(cv);
  const t0 = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    if (!vis || document.hidden) return;
    const t = (now - t0) / 1000;
    if (!hoverOK) { tx = .5 + .3 * Math.sin(t * .4); ty = .5 + .2 * Math.cos(t * .3); }
    mx += (tx - mx) * .06; my += (ty - my) * .06; dk += (dark - dk) * .08;
    gl.uniform2f(ur, cv.width, cv.height); gl.uniform1f(ut, reduce ? 10 : t); gl.uniform2f(um, mx, my); gl.uniform1f(ud, dk);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  })(t0);
})();

/* Command menu: Ctrl/Cmd+K */
(function () {
  const cmd = $('#cmd'), cq = $('#cmdq'), cl = $('#cmdl');
  $('#kkey').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '\u2318 K' : 'Ctrl K';
  const items = [['Approach', '#funnel'], ['Work', '#work'], ['Writing', '#writing'], ['About', '#about'], ['Contact', '#contact'],
    ['Download CV', () => { const l = document.createElement('a'); l.href = 'Kabelo_Pheeloane_CV.pdf'; l.download = ''; l.click(); }],
    ['Email Kabelo', () => { location.href = 'mailto:kabelo.p.pheeloane@gmail.com'; }],
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
