/* =============================================
   SnapBooth — app.js
   ============================================= */

// ── State ──────────────────────────────────────
let gridRows = 1, gridCols = 1;
let theme    = 'dark', filt = 'none';
let timerSec = 3, delaySec = 2;
let photos   = [], busy = false, mirror = true;
let cdInt    = null;

// ── Theme definitions ──────────────────────────
const themes = {
  dark:    { bg: '#0a0a0f', frame: '#2a2a4a', text: '#e8ff47',  sub: '#4fffb0',  label: '📸 SNAPBOOTH'       },
  white:   { bg: '#ffffff', frame: '#dddddd', text: '#1a1a2e',  sub: '#888888',  label: '✦ SnapBooth ✦'      },
  pink:    { bg: '#fff0f8', frame: '#ffb6e1', text: '#c0006a',  sub: '#ff69b4',  label: '🌸 SnapBooth 🌸'    },
  retro:   { bg: '#f5e6c3', frame: '#c9a96e', text: '#4a2c0a',  sub: '#8b6540',  label: 'STUDIO SNAP'        },
  neon:    { bg: '#0d0026', frame: '#b06aff', text: '#ff6ef4',  sub: '#40e0ff',  label: '⚡ NEON BOOTH'       },
  rainbow: { bg: '#1a0f2e', frame: '#ff6eb4', text: '#ffe040',  sub: '#40e0ff',  label: '🌈 Rainbow Booth'   },
};

// ── Canvas filter functions ────────────────────
const filterFns = {
  none: null,

  grayscale(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const g = d.data[i] * .3 + d.data[i+1] * .59 + d.data[i+2] * .11;
      d.data[i] = d.data[i+1] = d.data[i+2] = g;
    }
    ctx.putImageData(d, 0, 0);
  },

  sepia(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const r = d.data[i], g = d.data[i+1], b = d.data[i+2];
      d.data[i]   = Math.min(255, r*.393 + g*.769 + b*.189);
      d.data[i+1] = Math.min(255, r*.349 + g*.686 + b*.168);
      d.data[i+2] = Math.min(255, r*.272 + g*.534 + b*.131);
    }
    ctx.putImageData(d, 0, 0);
  },

  vivid(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i]   = Math.min(255, d.data[i]   * 1.35);
      d.data[i+1] = Math.min(255, d.data[i+1] * .88);
      d.data[i+2] = Math.min(255, d.data[i+2] * 1.45);
    }
    ctx.putImageData(d, 0, 0);
  },

  warm(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i]   = Math.min(255, d.data[i]   * 1.2 + 18);
      d.data[i+1] = Math.min(255, d.data[i+1] * 1.05 + 5);
      d.data[i+2] = Math.max(0,   d.data[i+2] * .78);
    }
    ctx.putImageData(d, 0, 0);
  },

  cool(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i]   = Math.max(0,   d.data[i]   * .82);
      d.data[i+1] = Math.min(255, d.data[i+1] * 1.04);
      d.data[i+2] = Math.min(255, d.data[i+2] * 1.3 + 20);
    }
    ctx.putImageData(d, 0, 0);
  },
};

// CSS filter map for live video preview
const videoFilterMap = {
  none:      '',
  grayscale: 'grayscale(1)',
  sepia:     'sepia(.9)',
  vivid:     'saturate(2) contrast(1.1)',
  warm:      'sepia(.4) saturate(1.5)',
  cool:      'hue-rotate(30deg) saturate(1.3) brightness(1.05)',
};


// ── Camera init ────────────────────────────────
async function initCam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 960, facingMode: 'user' },
      audio: false,
    });
    document.getElementById('video').srcObject = stream;
  } catch (e) {
    const status = document.getElementById('cstatus');
    status.textContent = '❌ Kamera tidak bisa diakses';
    status.style.color = '#ff4f6a';
  }
}


// ── Decorative animations ──────────────────────
function spawnStars() {
  const emojis = ['⭐','💫','✨','🌟','💥','🎀','🎊','🎈','🦋','🌸'];
  const container = document.getElementById('stars');
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'star';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      font-size: ${14 + Math.random() * 18}px;
      animation-duration: ${8 + Math.random() * 14}s;
      animation-delay: -${Math.random() * 15}s;
    `;
    container.appendChild(el);
  }
}

function burst(x, y) {
  const colors = ['#ff6eb4','#ffe040','#40e0ff','#b06aff','#4dffb0','#ff8c42','#ff4f6a','#fff'];
  for (let i = 0; i < 65; i++) {
    const el    = document.createElement('div');
    el.className = 'cpcs';
    const angle = Math.random() * 360;
    const dist  = 60 + Math.random() * 220;
    const tx    = Math.cos(angle * Math.PI / 180) * dist;
    el.style.cssText = `
      position: fixed;
      left: ${x}px; top: ${y}px;
      width:  ${6 + Math.random() * 9}px;
      height: ${6 + Math.random() * 9}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > .5 ? '50%' : '3px'};
      animation-duration: ${.8 + Math.random() * 1.3}s;
      animation-delay: ${Math.random() * .3}s;
      transform: translateX(${tx}px);
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
}


// ── UI control setters ─────────────────────────
function setGrid(rows, cols, id) {
  gridRows = rows;
  gridCols = cols;
  document.querySelectorAll('.gbtn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  buildDots();
}

function setTheme(name) {
  theme = name;
  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  document.getElementById('theme-' + name).classList.add('active');
}

function setFilter(name) {
  filt = name;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  document.getElementById('filter-' + name).classList.add('active');
  document.getElementById('video').style.filter = videoFilterMap[name] || '';
}

function toggleMirror() {
  mirror = !mirror;
  document.getElementById('video').style.transform = mirror ? 'scaleX(-1)' : 'scaleX(1)';
  document.getElementById('btn-mirror').textContent = mirror ? '⊘ Mirror' : '↔ Normal';
}


// ── Photo dots ─────────────────────────────────
function buildDots() {
  photos = [];
  const wrap  = document.getElementById('dots-wrap');
  // Keep first child (label), remove the rest
  while (wrap.children.length > 1) wrap.removeChild(wrap.lastChild);

  for (let i = 0; i < gridRows * gridCols; i++) {
    const dot = document.createElement('div');
    dot.className = 'pdot';
    dot.id = 'dot' + i;
    wrap.appendChild(dot);
  }
}

function updateDots() {
  for (let i = 0; i < gridRows * gridCols; i++) {
    const dot = document.getElementById('dot' + i);
    if (!dot) continue;
    if      (i < photos.length)  dot.className = 'pdot taken';
    else if (i === photos.length) dot.className = 'pdot cur';
    else                          dot.className = 'pdot';
  }
}


// ── Capture flow ───────────────────────────────
async function startBooth() {
  if (busy) return;
  buildDots();
  document.getElementById('result-wrap').style.display = 'none';
  document.getElementById('strip').style.display       = 'none';
  busy = true;

  const btn = document.getElementById('btn-start');
  btn.disabled    = true;
  btn.textContent = '🔴 Mengambil foto...';

  const total = gridRows * gridCols;
  for (let i = 0; i < total; i++) {
    updateDots();
    await doCountdown(timerSec);
    await snap();
    if (i < total - 1) await sleep(delaySec * 1000);
  }

  busy = false;
  btn.disabled    = false;
  btn.textContent = '📸 MULAI FOTO!';
  renderStrip();
}

function doCountdown(secs) {
  return new Promise(resolve => {
    const el = document.getElementById('cdown');
    el.classList.add('show');
    let n = secs;

    const tick = () => {
      el.innerHTML = `<span class="cdnum">${n}</span>`;
      n--;
      if (n < 0) {
        clearInterval(cdInt);
        el.classList.remove('show');
        resolve();
      }
    };
    tick();
    cdInt = setInterval(tick, 1000);
  });
}

function snap() {
  return new Promise(resolve => {
    const video   = document.getElementById('video');
    const canvas  = document.getElementById('cap');
    const W = video.videoWidth  || 640;
    const H = video.videoHeight || 480;

    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (mirror) { ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, W, H);
    if (mirror) ctx.restore();

    const fn = filterFns[filt];
    if (fn) fn(ctx, W, H);

    photos.push(canvas.toDataURL('image/jpeg', .92));

    // Flash animation
    const flash = document.getElementById('flash');
    flash.classList.remove('flash');
    void flash.offsetHeight; // reflow trigger
    flash.classList.add('flash');

    // Shutter click sound
    try {
      const ac  = new AudioContext();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .15);
      osc.start();
      osc.stop(ac.currentTime + .15);
    } catch (e) { /* AudioContext blocked, ignore */ }

    setTimeout(resolve, 300);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function resetBooth() {
  if (cdInt) clearInterval(cdInt);
  busy   = false;
  photos = [];
  buildDots();
  document.getElementById('result-wrap').style.display = 'none';
  document.getElementById('strip').style.display       = 'none';
  document.getElementById('cdown').classList.remove('show');
  const btn = document.getElementById('btn-start');
  btn.disabled    = false;
  btn.textContent = '📸 MULAI FOTO!';
}


// ── Canvas helpers ─────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);          ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);          ctx.arcTo(x, y + h,     x, y + h - r,     r);
  ctx.lineTo(x, y + r);              ctx.arcTo(x, y,         x + r, y,         r);
  ctx.closePath();
}


// ── Render photobooth strip ────────────────────
function renderStrip() {
  const t      = themes[theme];
  const total  = gridRows * gridCols;
  const PW     = 280, PH = Math.round(PW * 3 / 4);
  const GAP    = 8, PAD = 20, FOOT = 52;
  const SW     = PAD * 2 + PW * gridCols + GAP * (gridCols - 1);
  const SH     = PAD * 2 + PH * gridRows + GAP * (gridRows - 1) + FOOT;

  const strip  = document.getElementById('strip');
  strip.width  = SW;
  strip.height = SH;
  const ctx    = strip.getContext('2d');

  // Background
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, SW, SH);

  // Decorative dots top
  const dotColors = ['#ff6eb4','#ffe040','#40e0ff','#b06aff','#4dffb0'];
  dotColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(PAD + i * 14, PAD / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Border
  ctx.strokeStyle = t.frame;
  ctx.lineWidth   = 3;
  rrect(ctx, 3, 3, SW - 6, SH - 6, 12);
  ctx.stroke();

  // Draw each photo
  const photoPromises = photos.slice(0, total).map((src, idx) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const col = idx % gridCols;
        const row = Math.floor(idx / gridCols);
        const x   = PAD + col * (PW + GAP);
        const y   = PAD + row * (PH + GAP);

        // Photo slot
        ctx.fillStyle = '#111';
        rrect(ctx, x, y, PW, PH, 6);
        ctx.fill();

        // Clip & draw
        ctx.save();
        rrect(ctx, x, y, PW, PH, 6);
        ctx.clip();
        const ia = img.width / img.height, sa = PW / PH;
        let sx, sy, sw, sh;
        if (ia > sa) { sh = img.height; sw = sh * sa; sx = (img.width - sw) / 2; sy = 0; }
        else         { sw = img.width;  sh = sw / sa; sx = 0; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, PW, PH);
        ctx.restore();

        // Number badge
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        rrect(ctx, x + PW - 24, y + 4, 20, 16, 4);
        ctx.fill();
        ctx.fillStyle    = '#fff';
        ctx.font         = 'bold 9px monospace';
        ctx.textAlign    = 'right';
        ctx.fillText(idx + 1 + '', x + PW - 6, y + 15);

        resolve();
      };
      img.src = src;
    })
  );

  Promise.all(photoPromises).then(() => {
    // Footer text
    const fy = SH - FOOT / 2;
    ctx.textAlign = 'center';
    ctx.font      = 'bold 14px monospace';
    ctx.fillStyle = t.text;
    ctx.fillText(t.label, SW / 2, fy - 9);

    const now = new Date();
    ctx.font      = '10px monospace';
    ctx.fillStyle = t.sub;
    ctx.fillText(
      now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + ' • snapbooth',
      SW / 2, fy + 8
    );

    // Decorative dots bottom
    dotColors.slice().reverse().forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(SW - PAD - i * 14, SH - PAD / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Show result
    strip.style.display = 'block';
    const resultWrap    = document.getElementById('result-wrap');
    resultWrap.style.display = 'flex';
    resultWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Confetti!
    const rect = strip.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    burst(cx, cy);
    setTimeout(() => burst(cx - 150, cy - 80),  200);
    setTimeout(() => burst(cx + 150, cy - 80),  400);
    setTimeout(() => burst(cx, cy + 100),        600);
  });
}


// ── Download ───────────────────────────────────
function dlStrip() {
  const strip = document.getElementById('strip');
  const a     = document.createElement('a');
  const now   = new Date();
  a.download  = `snapbooth-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.png`;
  a.href      = strip.toDataURL('image/png');
  a.click();
  burst(window.innerWidth / 2, window.innerHeight / 2);
}


// ── Boot ───────────────────────────────────────
spawnStars();
buildDots();
initCam();