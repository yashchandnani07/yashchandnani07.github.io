(() => {
  const SIZE = 0.8;  // people size multiplier (1 = original)
  const SPEED = 0.7; // walking speed multiplier (1 = original)
  const SHEETS =Array.from({ length: 7 }, (_, i) => `footer/bengaluru/crowd-${String(i + 1).padStart(2, "0")}.webp`);
  // per-cell scale of the 105 sprites: 60 x 1, 15 x 0.7, 15 x 0.95, 15 x 1
  const SCALE = [...Array(60).fill(1), ...Array(15).fill(0.7), ...Array(15).fill(0.95), ...Array(15).fill(1)];

  const scene = document.querySelector(".footer-crowd-scene");
  const layers = [scene.querySelector(".footer-crowd-back"), scene.querySelector(".footer-crowd-front")];
  const ctxs = layers.map((c) => c.getContext("2d"));
  const portrait = scene.querySelector("img");
  const imgs = SHEETS.map((src) => { const im = new Image(); im.src = src; return im; });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false, visible = false, ready = false;
  let W = 0, H = 0, dpr = 1, time = 0, last = 0, raf = 0, maxW = 0, span = 0, people = [];

  const rnd = (n) => { const t = 43758.5453 * Math.sin(127.1 * n + 311.7); return t - Math.floor(t); };

  function draw() {
    ctxs.forEach((c) => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); });
    for (const p of people) {
      const t = p.phase + (time * p.speed) / 10;
      const lap = Math.floor(t);
      const a = t - lap;
      const s = (p.cell + 37 * lap) % 105;
      const sheet = imgs[Math.floor(s / 15)];
      const cw = sheet.naturalWidth / 5, ch = sheet.naturalHeight / 3;
      const k = s % 15;
      const x = (p.direction === 1 ? a : 1 - a) * span - maxW;
      const bob = (1 - Math.cos((time * p.speed + 10 * p.phase) * Math.PI * 4)) * 5;
      const f = SCALE[s];
      const c = ctxs[p.layer];
      c.save();
      c.translate(x, p.baseline + p.h * (1 - f) - bob);
      c.scale(p.direction, 1);
      c.drawImage(sheet, (k % 5) * cw, Math.floor(k / 5) * ch, cw, ch, (-p.w * f) / 2, 0, p.w * f, p.h * f);
      c.restore();
    }
  }

  function tick(now) {
    if (last) time += Math.min((now - last) / 1000, 0.05);
    last = now;
    draw();
    raf = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (!ready) return;
    draw();
    if (visible && !document.hidden && !paused && !reduced.matches) raf = requestAnimationFrame(tick);
  }

  function layout() {
    if (!ready) return;
    const w = scene.clientWidth, h = scene.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    dpr = Math.min(devicePixelRatio || 1, 2);
    const n = portrait.getBoundingClientRect().height;
    layers.forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });

    const wide = W >= 600;
    const s = Math.min(1, n / 310);
    const o = W / (1440 * s);
    const rows = wide ? [25, 16] : [Math.max(9, Math.round(25 * o)), Math.max(6, Math.round(16 * o))];
    const total = rows[0] + rows[1];

    people = Array.from({ length: total }, (_, t) => {
      const row = t < rows[0] ? 0 : 1;
      const i = t - (row === 0 ? 0 : rows[0]);
      const count = rows[row];
      const h2 = (row === 1 ? 250 + 30 * rnd(t + 8) : 170 + 35 * rnd(t + 8)) * s * SIZE;
      const baseline = row === 0 ? H - n - 12 + 24 * rnd(t + 4) : H - h2 + 30 * s + 15 * rnd(t + 4);
      return {
        cell: (37 * Math.floor((105 * t) / total)) % 105,
        layer: +(row > 0 || i % 3 === 0),
        h: h2, w: 0.8 * h2, baseline,
        speed: [0.7, 1.05][row] * SPEED * (0.88 + 0.24 * rnd(t + 97)),
        phase: (i + 0.85 * rnd(t + 41)) / count,
        direction: row === 1 ? -1 : 1,
      };
    }).sort((a, b) => a.baseline - b.baseline);

    maxW = Math.max(...people.map((p) => p.w));
    span = W + 2 * maxW;
    sync();
  }

  // pause / resume on click
  scene.addEventListener("click", () => {
    paused = !paused;
    scene.setAttribute("aria-pressed", String(paused));
    scene.setAttribute("aria-label", paused ? "YASH. Resume crowd animation" : "YASH. Pause crowd animation");
    sync();
  });
  reduced.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }, { rootMargin: "80px" }).observe(scene);
  new ResizeObserver(layout).observe(scene);

  Promise.all([...imgs, portrait].map((im) => im.decode().catch(() => {}))).then(() => { ready = true; layout(); });

  // footer top reveal + back to top
  const top = document.querySelector(".footer-top");
  new IntersectionObserver((e) => { if (e[0].isIntersecting) top.classList.add("is-in"); }, { threshold: 0.2 }).observe(top);
  document.getElementById("back-to-top").addEventListener("click", (e) => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: reduced.matches ? "instant" : "smooth" });
  });
})();
