'use strict';
/* Stack Attack – Spiel-Engine (Canvas, keine Abhängigkeiten) */
(function () {
  const SA = window.SA;
  const W = 960, H = 700;
  const AUFL = 2; // interne Auflösung (doppelt so scharf)
  const cv = document.getElementById('spielfeld');
  cv.width = W * AUFL;
  cv.height = H * AUFL;
  const ctx = cv.getContext('2d');
  const $ = (id) => document.getElementById(id);

  const FONT_PIXEL = '"Press Start 2P", monospace';
  const FONT_CODE = 'ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
  const FONT_UI = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  // ================= Geometrie =================
  const R = [
    { x1: 60, y1: 198, x2: 880, y2: 228 },  // 2. OG, fällt nach rechts
    { x1: 900, y1: 416, x2: 80, y2: 446 },  // 1. OG, fällt nach links
    { x1: 60, y1: 610, x2: 900, y2: 640 },  // EG, fällt nach rechts
  ];
  const rampY = (r, x) => r.y1 + ((x - r.x1) / (r.x2 - r.x1)) * (r.y2 - r.y1);
  const BANDS = [
    { y0: 44, y1: 262, name: '2. OG', wand: '#a39478', sockel: '#857860' },
    { y0: 262, y1: 480, name: '1. OG', wand: '#87997f', sockel: '#6b7d64' },
    { y0: 480, y1: 700, name: 'EG', wand: '#8693a5', sockel: '#6a7686' },
  ];
  const BODEN_H = 14;
  const SK = 5; // Pixelgröße der Figuren
  const STUDI_X = 800;
  const STUDI_Y = Math.round(rampY(R[2], STUDI_X));
  const KONTAKT_X = STUDI_X - 28;
  const KICK_FENSTER = 100;
  const TONNE = { x: 900, y: 646, w: 56, h: 40 };
  const START_X = 262;
  const BUG_X = 36;
  const BUG_Y = Math.round(rampY(R[0], 76));
  const WURF_X = BUG_X + 40, WURF_Y = BUG_Y - 70;
  const SEG_UNTEN = 4; // Pfadsegment auf der untersten Rampe
  const SPRUNG_T = 0.72, SPRUNG_H = 72;

  const PFAD = [];
  let PFAD_LEN = 0;
  (function bauePfad() {
    const P = [
      [START_X, rampY(R[0], START_X), 1.8],
      [862, rampY(R[0], 862), 2.6],
      [862, rampY(R[1], 862), 1.8],
      [98, rampY(R[1], 98), 2.6],
      [98, rampY(R[2], 98), 1.0],
      [928, rampY(R[2], 928), 2.6],
      [928, 680, 0],
    ];
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, y0, f] = P[i];
      const [x1, y1] = P[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      PFAD.push({ x0, y0, x1, y1, f, len, s0: PFAD_LEN });
      PFAD_LEN += len;
    }
  })();
  function pfadPos(s) {
    for (let i = 0; i < PFAD.length; i++) {
      const g = PFAD[i];
      if (s < g.s0 + g.len) {
        const t = (s - g.s0) / g.len;
        return { x: g.x0 + (g.x1 - g.x0) * t, y: g.y0 + (g.y1 - g.y0) * t, seg: i, t };
      }
    }
    const g = PFAD[PFAD.length - 1];
    return { x: g.x1, y: g.y1, seg: PFAD.length, t: 1 };
  }

  // ================= Sprites =================
  const STUDI_PAL = { h: '#3d2a8a', H: '#6a4fd8', B: '#4a2c1a', S: '#f0c49a', E: '#1a1a2e', W: '#f2f2f2',
    J: '#2d4f8f', j: '#1f3a6a', Z: '#f2f2f2', C: '#ffffff', c: '#8a5a2b' };
  const STUDI_OBEN = [
    '....hhhhhh....',
    '...hHHHHHHh...',
    '..hHHBBBBHHh..',
    '..hHBSSSSBHh..',
    '..hHSESSESHh..',
    '..hHSSSSSSHh..',
    '...hHSSSSHh...',
    '..hHHHWHHWHHh.',
    '.hHHHHWHHWHHHh',
    '.hHHHHHHHHHHHh',
  ];
  const STUDI_STEHEN = STUDI_OBEN.concat([
    '.ShHHHHHHHHhCC',
    '..hhhhhhhhhhcc',
    '...JJJJJJJJ...',
    '...JJj..jJJ...',
    '...JJ....JJ...',
    '..ZZZ....ZZZ..',
  ]);
  const STUDI_SPRUNG = STUDI_OBEN.concat([
    '.ShHHHHHHHHhCC',
    '..hhhhhhhhhhcc',
    '...JJJJJJJJ...',
    '..JJJJ..JJJJ..',
    '..ZZZ....ZZZ..',
    '..............',
  ]);
  const STUDI_KICK = STUDI_OBEN.concat([
    '.ShHHHHHHHHhCC',
    '..hhhhhhhhhhcc',
    '...JJJJJJJJJJZ',
    '...JJj....JJZZ',
    '...JJ.........',
    '..ZZZ.........',
  ]);
  const BUG_PAL = { K: '#111018', R: '#ff4040', W: '#ffffff', G: '#4cbb4c', g: '#2b7a34', Y: '#9cf27a', L: '#111018' };
  const BUG_A = [
    '..K..........K..',
    '...K........K...',
    '....KKKKKKKK....',
    '...KRRKKKKRRK...',
    '...KRWKKKKRWK...',
    '..KKKKKKKKKKKK..',
    'L.KgGGGGgGGGGK.L',
    '.LKGGYGGgGGYGGKL',
    '..KGGGGGgGGGGGK.',
    'LLKGGYGGgGGYGGKL',
    '..KgGGGGgGGGGgK.',
    '.L.KKKKKKKKKKK.L',
  ];
  const BUG_B = BUG_A.slice();
  BUG_B[6] = '.LKgGGGGgGGGGKL.';
  BUG_B[9] = '.LKGGYGGgGGYGGK.L'.slice(0, 16);
  BUG_B[11] = 'L..KKKKKKKKKKK..';
  const BUG_WURF = BUG_A.slice();
  BUG_WURF[0] = 'L.K..........K.L';
  BUG_WURF[1] = '.L.K........K.L.';
  BUG_WURF[2] = '..LKKKKKKKKKKL..';

  /** Scale2x: verdoppelt die Auflösung einer Pixelgrafik und glättet dabei Diagonalen. */
  function scale2x(rows) {
    const px = (r, c) => (rows[r] && rows[r][c]) || '.';
    const out = [];
    for (let r = 0; r < rows.length; r++) {
      let o1 = '', o2 = '';
      for (let c = 0; c < rows[r].length; c++) {
        const P = px(r, c), A = px(r - 1, c), B = px(r, c + 1), C = px(r, c - 1), D = px(r + 1, c);
        o1 += (C === A && C !== D && A !== B ? A : P) + (A === B && A !== C && B !== D ? B : P);
        o2 += (D === C && D !== B && C !== A ? C : P) + (B === D && B !== A && D !== C ? D : P);
      }
      out.push(o1, o2);
    }
    return out;
  }
  const geglaettet = new Map();
  function sprite(roh, pal, x, y, groesse) {
    if (!geglaettet.has(roh)) geglaettet.set(roh, scale2x(roh));
    const rows = geglaettet.get(roh);
    const s = groesse / 2;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        ctx.fillStyle = pal[ch];
        ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
  }

  // ================= Ton =================
  let audio = null;
  let stumm = false;
  function ton(f, d, typ = 'square', vol = 0.05, f2 = null, verz = 0) {
    if (stumm) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + verz;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = typ;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch (e) { /* kein Ton – egal */ }
  }
  const SFX = {
    sprung: () => ton(260, 0.16, 'square', 0.035, 620),
    kick: () => ton(140, 0.09, 'square', 0.06, 50),
    richtig: () => { ton(523, 0.08, 'square', 0.045); ton(659, 0.08, 'square', 0.045, null, 0.08); ton(988, 0.16, 'square', 0.045, null, 0.16); },
    gesprungen: () => ton(880, 0.05, 'triangle', 0.04),
    falsch: () => { ton(220, 0.45, 'sawtooth', 0.05, 55); },
    autsch: () => ton(420, 0.3, 'square', 0.05, 70),
    wurf: () => ton(700, 0.07, 'triangle', 0.03, 300),
    brennen: () => ton(110, 0.25, 'sawtooth', 0.02, 40),
    fertig: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton(f, 0.14, 'square', 0.045, null, i * 0.11)),
    kaffee: () => [523, 784, 1047, 1319].forEach((f, i) => ton(f, 0.1, 'triangle', 0.06, null, i * 0.07)),
    gameover: () => [392, 330, 262, 196].forEach((f, i) => ton(f, 0.28, 'square', 0.05, null, i * 0.24)),
  };

  // ================= Highscores (lokal) =================
  const HS_KEY = 'stackattack.highscores.v1';
  const NAME_KEY = 'stackattack.name';
  function hsLaden() { try { return JSON.parse(localStorage.getItem(HS_KEY)) || {}; } catch (e) { return {}; } }
  function hsListe(key) { return (hsLaden()[key] || []).slice(0, 10); }
  function hsQualifiziert(key, punkte) { const l = hsListe(key); return punkte > 0 && (l.length < 10 || punkte > l[l.length - 1].punkte); }
  function hsEintragen(key, name, punkte) {
    const alle = hsLaden();
    const l = alle[key] || [];
    l.push({ name, punkte, datum: new Date().toISOString().slice(0, 10) });
    l.sort((a, b) => b.punkte - a.punkte);
    alle[key] = l.slice(0, 10);
    try { localStorage.setItem(HS_KEY, JSON.stringify(alle)); localStorage.setItem(NAME_KEY, name); } catch (e) { /* privat-Modus */ }
  }
  function letzterName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }

  // ================= Hilfen =================
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const KW = new Set(('public private protected static final abstract return if else for while do new class null break ' +
    'continue switch case default this super try catch finally throw throws extends implements interface import package true false').split(' '));
  const TY = new Set('void int long double float char boolean byte short String Integer Double Math System'.split(' '));
  function hl(text) {
    const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index));
      const t = m[0];
      let cls = '';
      if (t[0] === '"' || t[0] === "'") cls = 'st';
      else if (t.startsWith('//')) cls = 'ko';
      else if (/^\d/.test(t)) cls = 'nu';
      else if (KW.has(t)) cls = 'kw';
      else if (TY.has(t)) cls = 'ty';
      out += cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
      last = m.index + t.length;
    }
    return out + esc(text.slice(last));
  }

  function umbrechen(text, max) {
    if (text.length <= max) return [text];
    const out = [];
    let rest = text;
    while (rest.length > max) {
      let i = rest.lastIndexOf(' ', max);
      if (i <= 0) i = max;
      out.push(rest.slice(0, i).trimEnd());
      rest = rest.slice(i).trimStart();
    }
    if (rest) out.push(rest);
    return out;
  }
  /** Maße einer Karte für ein Codestück. */
  function messe(text) {
    let zeilen = umbrechen(text, 24);
    let gr = 17, zh = 20;
    if (zeilen.length > 2) { zeilen = umbrechen(text, 30); gr = 14; zh = 16; }
    ctx.font = `600 ${gr}px ${FONT_CODE}`;
    const w = Math.ceil(Math.max(...zeilen.map((z) => ctx.measureText(z).width))) + 22;
    return { zeilen, gr, zh, w: Math.max(w, 40), h: zeilen.length * zh + 14 };
  }

  // ================= Hintergrund (einmal vorberechnet) =================
  let hintergrund = null;
  function baueHintergrund() {
    const c = document.createElement('canvas');
    c.width = W * AUFL; c.height = H * AUFL;
    const g = c.getContext('2d');
    g.scale(AUFL, AUFL);
    const text = (t, x, y, gr, farbe, align = 'center', gewicht = 700) => {
      g.font = `${gewicht} ${gr}px ${FONT_UI}`; g.fillStyle = farbe; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(t, x, y);
    };

    function tuer(x, boden, label, w = 60) {
      const h = 124, y = boden - h;
      g.fillStyle = '#2e2219'; g.fillRect(x - 5, y - 5, w + 10, h + 5);
      g.fillStyle = '#8a5a36'; g.fillRect(x, y, w, h);
      g.fillStyle = '#7a4d2d'; g.fillRect(x + 7, y + 60, w - 14, h - 70);
      g.fillStyle = '#a9d4e6'; g.fillRect(x + w / 2 - 11, y + 12, 22, 36);
      g.fillStyle = '#d7eef7'; g.fillRect(x + w / 2 - 11, y + 12, 7, 36);
      g.fillStyle = '#2e2219'; g.fillRect(x + w / 2 - 1, y + 12, 2, 36);
      g.fillStyle = '#e3c76b'; g.fillRect(x + w - 15, y + h / 2, 10, 5);
      g.font = `700 11px ${FONT_UI}`;
      const sw = Math.max(w + 12, g.measureText(label).width + 14);
      g.fillStyle = '#efefe6'; g.fillRect(x + w / 2 - sw / 2, y - 26, sw, 17);
      g.fillStyle = '#2e2219'; g.fillRect(x + w / 2 - sw / 2, y - 10, sw, 1);
      text(label, x + w / 2, y - 17, 11, '#222');
    }
    function doppeltuer(x, boden, label) { tuer(x, boden, label, 96); g.fillStyle = '#2e2219'; g.fillRect(x + 47, boden - 124, 2, 124); }
    function poster(x, y, w, h, farbe, zeilen, tf = '#1b1b1b') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 3, y + 3, w, h);
      g.fillStyle = farbe; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - 3, y - 3, 12, 6); g.fillRect(x + w - 9, y - 3, 12, 6);
      zeilen.forEach((z, i) => text(z, x + w / 2, y + 15 + i * 14, i === 0 ? 12 : 10, tf));
    }
    function brett(x, y) {
      g.fillStyle = '#5b3a1e'; g.fillRect(x - 5, y - 5, 130, 80);
      g.fillStyle = '#c4945c'; g.fillRect(x, y, 120, 70);
      const farben = ['#fff59d', '#f8bbd0', '#b3e5fc', '#ffffff', '#c8e6c9'];
      for (let i = 0; i < 7; i++) {
        const nx = x + 7 + (i % 4) * 28 + (i > 3 ? 12 : 0), ny = y + 6 + (i > 3 ? 33 : 0);
        g.fillStyle = farben[i % farben.length]; g.fillRect(nx, ny, 22, 26);
        g.fillStyle = '#999'; g.fillRect(nx + 3, ny + 8, 16, 1); g.fillRect(nx + 3, ny + 13, 12, 1); g.fillRect(nx + 3, ny + 18, 16, 1);
        g.fillStyle = '#d33'; g.fillRect(nx + 10, ny + 1, 3, 3);
      }
      text('SCHWARZES BRETT', x + 60, y - 13, 10, '#222');
    }
    function uhr(x, y) {
      g.fillStyle = '#222'; g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f5f5f0'; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#222'; g.fillRect(x - 1, y - 11, 2, 12); g.fillRect(x, y - 1, 8, 2);
    }
    function feuerloescher(x, boden) {
      g.fillStyle = '#c62828'; g.fillRect(x, boden - 48, 16, 40);
      g.fillStyle = '#8e1c1c'; g.fillRect(x + 11, boden - 48, 5, 40);
      g.fillStyle = '#222'; g.fillRect(x + 4, boden - 55, 8, 7); g.fillRect(x - 5, boden - 53, 9, 3);
      g.fillStyle = '#eee'; g.fillRect(x + 2, boden - 36, 12, 9);
    }
    function pflanze(x, boden) {
      g.fillStyle = '#b5651d'; g.fillRect(x, boden - 26, 30, 26);
      g.fillStyle = '#8b4c15'; g.fillRect(x, boden - 26, 30, 5);
      g.fillStyle = '#2e7d32';
      [[4, -52], [13, -66], [20, -48], [-3, -40], [25, -58], [11, -42]].forEach(([dx, dy]) => g.fillRect(x + dx, boden + dy, 9, 18));
      g.fillStyle = '#43a047';
      [[6, -58], [18, -54], [2, -44]].forEach(([dx, dy]) => g.fillRect(x + dx, boden + dy, 7, 12));
    }
    function fenster(x, y) {
      g.fillStyle = '#2b2438'; g.fillRect(x - 5, y - 5, 110, 74);
      g.fillStyle = '#5fa8d3'; g.fillRect(x, y, 100, 64);
      g.fillStyle = '#86c5e8'; g.fillRect(x, y, 100, 24);
      g.fillStyle = '#fff'; g.fillRect(x + 14, y + 10, 20, 5); g.fillRect(x + 62, y + 18, 24, 5);
      g.fillStyle = '#3f7f3f'; g.fillRect(x, y + 48, 100, 16);
      g.fillStyle = '#2b2438'; g.fillRect(x + 48, y, 4, 64);
    }

    // Stockwerke
    for (const b of BANDS) {
      const bodenTop = b.y1 - BODEN_H;
      g.fillStyle = b.wand; g.fillRect(0, b.y0, W, b.y1 - b.y0);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.04)';
        g.fillRect(Math.floor(Math.random() * W / 4) * 4, b.y0 + Math.floor(Math.random() * (b.y1 - b.y0) / 4) * 4, 4, 4);
      }
      g.fillStyle = '#2a2633'; g.fillRect(0, b.y0, W, 8);
      for (let x = 70; x < W; x += 230) {
        g.fillStyle = 'rgba(255,255,220,.10)'; g.fillRect(x - 30, b.y0 + 8, 140, 34);
        g.fillStyle = '#fffbe0'; g.fillRect(x, b.y0 + 8, 80, 5);
        g.fillStyle = '#bbb6a0'; g.fillRect(x - 4, b.y0 + 8, 88, 2);
      }
      g.fillStyle = b.sockel; g.fillRect(0, bodenTop - 44, W, 44);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, bodenTop - 46, W, 2);
      for (let x = 0; x < W; x += 16) {
        g.fillStyle = (x / 16) % 2 ? '#4b4552' : '#3e3946';
        g.fillRect(x, bodenTop, 16, BODEN_H);
      }
      g.fillStyle = '#24202b'; g.fillRect(0, bodenTop, W, 2);
      g.fillStyle = '#1f4e8c'; g.fillRect(0, b.y0 + 16, 56, 24);
      text(b.name, 28, b.y0 + 28, 13, '#fff');
    }

    // 2. OG
    let b = BANDS[0];
    let boden = b.y1 - BODEN_H;
    tuer(160, boden, 'DEKANAT');
    poster(262, b.y0 + 46, 66, 64, '#ffcc4d', ['KLAUSUR', 'Mo 8:00', 'Hörsaal 1']);
    tuer(370, boden, 'A 2.14');
    fenster(474, b.y0 + 40);
    poster(608, b.y0 + 46, 64, 56, '#9ad0ff', ['HIWI', 'gesucht', '(Java)']);
    tuer(700, boden, 'LABOR');
    poster(800, b.y0 + 50, 56, 48, '#ff9ad5', ['ERSTI', 'Party!']);
    uhr(910, b.y0 + 62);

    // 1. OG
    b = BANDS[1];
    boden = b.y1 - BODEN_H;
    doppeltuer(120, boden, 'HÖRSAAL 2');
    poster(258, b.y0 + 50, 70, 64, '#c5f27a', ['JAVA', 'Tutorium', 'Do 14:00']);
    brett(352, b.y0 + 56);
    tuer(500, boden, 'FACHSCHAFT', 66);
    feuerloescher(592, boden);
    tuer(640, boden, 'A 1.07');
    poster(728, b.y0 + 48, 72, 66, '#ffffff', ['NULL', 'POINTER?', 'Selbsthilfe'], '#c62828');
    tuer(836, boden, 'WC', 48);

    // EG
    b = BANDS[2];
    boden = b.y1 - BODEN_H;
    fenster(96, b.y0 + 40);
    tuer(240, boden, 'PRÜFUNGSAMT', 66);
    poster(344, b.y0 + 48, 70, 64, '#ffcc4d', ['MENSA', 'heute:', 'Schnitzel']);
    brett(440, b.y0 + 56);
    tuer(600, boden, 'BIBLIOTHEK', 66);
    poster(700, b.y0 + 46, 62, 56, '#9ad0ff', ['WG-', 'Zimmer', 'frei']);
    pflanze(748, boden);
    g.fillStyle = '#1f4e8c'; g.fillRect(836, b.y0 + 30, 112, 22);
    text('MENSA →', 892, b.y0 + 41, 12, '#fff');

    // Rampen (Baustellen-Look) und Stützen
    for (const r of R) {
      const dir = Math.sign(r.x2 - r.x1);
      const n = Math.ceil(Math.abs(r.x2 - r.x1) / 8);
      const band = BANDS.find((bb) => r.y2 < bb.y1);
      for (let x = Math.min(r.x1, r.x2) + 60; x < Math.max(r.x1, r.x2) - 20; x += 210) {
        const y = rampY(r, x) + 14;
        g.fillStyle = '#4a4752'; g.fillRect(x, y, 6, band.y1 - BODEN_H - y);
        g.fillStyle = '#625e6c'; g.fillRect(x, y, 2, band.y1 - BODEN_H - y);
      }
      for (let i = 0; i < n; i++) {
        const xa = r.x1 + dir * i * 8;
        const xl = Math.min(xa, xa + dir * 8);
        const ya = Math.round(rampY(r, xa + dir * 4));
        g.fillStyle = Math.floor(i / 2) % 2 ? '#f2c230' : '#1b1b1b';
        g.fillRect(xl, ya, 8, 5);
        g.fillStyle = '#5d5a66'; g.fillRect(xl, ya + 5, 8, 7);
        g.fillStyle = '#3a3842'; g.fillRect(xl, ya + 12, 8, 2);
        if (i % 6 === 0) { g.fillStyle = '#8a8696'; g.fillRect(xl + 3, ya + 7, 2, 2); }
      }
    }
    hintergrund = c;
  }

  // ================= Spielzustand =================
  let AUFGABEN = [];
  let S = null;

  function neuesSpiel(liste, modus) {
    S = { modus, liste, pos: 0, punkte: 0, leben: 3, fehler: 0, zeit: 0, effekte: [], teile: [] };
    starteLevel();
  }

  function starteLevel() {
    const a = AUFGABEN[S.liste[S.pos]];
    Object.assign(S, {
      aufgabe: a,
      level: S.modus === 'karriere' ? S.pos : 1,
      gefuellt: a.teile.map(() => false),
      naechstes: 0,
      teile: [],
      effekte: [],
      spawnTimer: 0.8,
      seitZiel: 0,
      letzter: null,
      letzterZeit: -99,
      kandidat: null,
      letzterAblenker: '',
      combo: 0,
      levelPunkte: 0,
      levelFehler: 0,
      pause: false,
      wackeln: 0,
      flamme: 0,
      zustand: 'spiel',
      banner: { text: S.modus === 'karriere' ? `LEVEL ${S.pos + 1}` : 'LOS GEHT\'S!', unter: a.titel, t: 2.4 },
      studi: { sprung: -1, hover: 0, kick: 0, getroffen: 0 },
      bug: { wurf: 0 },
      idZaehler: 0,
      letzterKaffee: S.zeit,
    });
    zeigeOverlay(null);
    renderPanel();
  }

  const tempo = () => (85 + 10 * S.level) * (1 + 0.25 * (S.naechstes / S.aufgabe.teile.length));
  const intervall = () => Math.max(1.3, 2.7 - 0.12 * S.level) * (1 - 0.15 * (S.naechstes / S.aufgabe.teile.length));
  const mult = () => Math.min(5, 1 + Math.floor(S.combo / 4));
  const ziel = () => S.aufgabe.teile[S.naechstes];
  const istZiel = (p) => S.naechstes < S.aufgabe.teile.length && p.norm === ziel().norm;
  const sprungHoehe = () => {
    const st = S.studi;
    return st.sprung < 0 ? 0 : Math.sin((Math.PI * Math.min(st.sprung, SPRUNG_T)) / SPRUNG_T) * SPRUNG_H;
  };

  function karte(text, warum) {
    return { text, norm: SA.norm(text), warum: warum || '', ...messe(text) };
  }

  function waehleTeil() {
    const a = S.aufgabe;
    const z = ziel();
    const zielUnterwegs = S.teile.some((p) => !p.entschieden && p.norm === z.norm);
    const r = Math.random();
    if (!zielUnterwegs && (S.seitZiel >= 3 || r < 0.4)) {
      S.seitZiel = 0;
      return karte(z.text, '');
    }
    S.seitZiel++;
    if (r < 0.82) {
      const liste = a.ablenker[S.naechstes].filter((x) => x.text !== S.letzterAblenker);
      if (liste.length) {
        const explizit = liste.filter((x) => x.explizit);
        const wahl = explizit.length && Math.random() < 0.65 ? pick(explizit) : pick(liste);
        S.letzterAblenker = wahl.text;
        return karte(wahl.text, wahl.warum);
      }
    }
    const spaeter = a.teile.slice(S.naechstes + 1).filter((t) => t.norm !== z.norm);
    if (spaeter.length && Math.random() < 0.55) return karte(pick(spaeter).text, '');
    const andere = a.ablenker.flat().filter((x) => x.norm !== z.norm);
    if (andere.length) { const w = pick(andere); return karte(w.text, w.warum); }
    S.seitZiel = 0;
    return karte(z.text, '');
  }

  function spawn(dt) {
    if (S.naechstes >= S.aufgabe.teile.length) return;
    S.spawnTimer -= dt;
    if (S.spawnTimer > 0) return;
    if (!S.kandidat) {
      const kaffeeDran = S.leben < 5 && !S.teile.some((p) => p.kaffee) && S.zeit - S.letzterKaffee > 20 && Math.random() < 0.15;
      if (kaffeeDran) S.letzterKaffee = S.zeit;
      S.kandidat = kaffeeDran ? { kaffee: true, text: 'Kaffee', norm: '§kaffee', warum: '', zeilen: [], w: 44, h: 44 } : waehleTeil();
    }
    const k = S.kandidat;
    if (S.letzter) {
      const noetig = (S.letzter.w / 2 + k.w / 2 + 170) / tempo();
      if (S.zeit + 0.5 - S.letzterZeit < noetig) return;
    }
    S.kandidat = null;
    const p = Object.assign(k, { id: S.idZaehler++, zustand: 'wurf', t: 0, x: WURF_X, y: WURF_Y, s: 0, seg: 0, skala: 1, rot: 0 });
    S.teile.push(p);
    S.bug.wurf = 0.5;
    S.letzter = p;
    S.letzterZeit = S.zeit + 0.5;
    S.spawnTimer = intervall();
    SFX.wurf();
  }

  // ================= Aktionen =================
  function springe() {
    if (!S || S.zustand !== 'spiel' || S.pause) return;
    const st = S.studi;
    if (st.sprung >= 0 || st.kick > 0 || st.getroffen > 0) return;
    st.sprung = 0;
    st.hover = 0;
    SFX.sprung();
  }

  function kick() {
    if (!S || S.zustand !== 'spiel' || S.pause) return;
    const st = S.studi;
    if (st.kick > 0 || st.sprung >= 0 || st.getroffen > 0) return;
    st.kick = 0.28;
    SFX.kick();
    let best = null;
    for (const p of S.teile) {
      if (p.zustand !== 'rutscht' || p.seg !== SEG_UNTEN || p.entschieden) continue;
      const front = p.x + p.w / 2;
      if (front >= KONTAKT_X - KICK_FENSTER && front <= KONTAKT_X + 6 && (!best || front > best.x + best.w / 2)) best = p;
    }
    if (!best) return;
    best.entschieden = 'kick';
    best.zustand = 'flug';
    best.flugT = 0;
    if (best.kaffee) {
      best.zustand = 'puff';
      best.t = 0;
      sammleKaffee();
      return;
    }
    if (istZiel(best)) {
      Object.assign(best, { vx: 760, vy: -640, vrot: 5 });
      S.gefuellt[S.naechstes] = true;
      const neu = S.naechstes;
      S.naechstes++;
      S.combo++;
      const pkt = 100 * mult();
      S.punkte += pkt;
      S.levelPunkte += pkt;
      SFX.richtig();
      funken(KONTAKT_X, STUDI_Y - 30, ['#f2c230', '#fff', '#7fe08a']);
      floater(`+${pkt}` + (mult() > 1 ? `  x${mult()}` : ''), '#7fe08a');
      renderCode(neu);
      if (S.naechstes >= S.aufgabe.teile.length) levelGeschafft();
    } else {
      Object.assign(best, { vx: (TONNE.x + TONNE.w / 2 - best.x) / 0.7, vy: -330, vrot: -7, zielTonne: true });
      S.leben--;
      S.fehler++;
      S.levelFehler++;
      S.combo = 0;
      S.wackeln = 0.3;
      SFX.falsch();
      zeigeErklaerung(best);
    }
  }

  function kontakt(p) {
    const st = S.studi;
    if (p.kaffee) {
      if (sprungHoehe() >= p.h - 6) {
        p.entschieden = 'ueber';
        floater('OH NEIN, DER KAFFEE!', '#ffb347');
      } else {
        p.entschieden = 'kaffee';
        p.zustand = 'puff';
        p.t = 0;
        sammleKaffee();
      }
      return;
    }
    if (sprungHoehe() >= p.h - 6) {
      p.entschieden = 'ueber';
      if (istZiel(p)) {
        S.combo = 0;
        floater('DAS HÄTTE GEPASST! KOMMT WIEDER …', '#ffb347');
      } else {
        S.combo++;
        const pkt = 10 * mult();
        S.punkte += pkt;
        S.levelPunkte += pkt;
        floater(`+${pkt}`, '#9cf27a');
        SFX.gesprungen();
      }
      return;
    }
    if (st.getroffen > 0) { p.entschieden = 'durch'; return; }
    p.entschieden = 'getroffen';
    S.leben--;
    S.fehler++;
    S.levelFehler++;
    S.combo = 0;
    st.getroffen = 1.3;
    st.sprung = -1;
    S.wackeln = 0.35;
    SFX.autsch();
    floater(istZiel(p) ? 'AUTSCH! DEN HÄTTEST DU KICKEN MÜSSEN!' : 'AUTSCH! DRÜBER SPRINGEN!', '#ff6b6b');
    if (S.leben <= 0) gameOver();
  }

  function sammleKaffee() {
    const voll = S.leben >= 5;
    S.leben = Math.min(5, S.leben + 1);
    if (voll) { S.punkte += 200; S.levelPunkte += 200; }
    floater(voll ? 'KAFFEE! +200' : '+1 KAFFEE ☕', '#ffe066');
    funken(KONTAKT_X, STUDI_Y - 40, ['#ffffff', '#8a5a2b', '#ffe066']);
    SFX.kaffee();
  }

  function inDieTonne() {
    S.flamme = 0.7;
    SFX.brennen();
  }

  function levelGeschafft() {
    S.zustand = 'fertig';
    S.fertigT = 1.6;
    S.bonusLeben = 100 * S.leben;
    S.bonusFehlerfrei = S.levelFehler === 0 ? 500 : 0;
    S.punkte += 250 + S.bonusLeben + S.bonusFehlerfrei;
    S.banner = { text: 'BUILD SUCCESSFUL', unter: 'Kompiliert – alle Teile sind drin!', t: 99 };
    for (const p of S.teile) if (p.zustand !== 'flug') { p.zustand = 'puff'; p.t = 0; }
    SFX.fertig();
    $('kopieren').disabled = false;
  }

  function gameOver() {
    S.zustand = 'gameover';
    S.fertigT = 1.6;
    S.banner = { text: 'GAME OVER', unter: 'Der Kaffee ist alle …', t: 99 };
    SFX.gameover();
  }

  // ================= Effekte =================
  function floater(text, farbe, x = STUDI_X, y = STUDI_Y - 115) {
    S.effekte.push({ typ: 'text', text, farbe, x, y, t: 0, dauer: 1.4 });
  }
  function funken(x, y, farben) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
      S.effekte.push({ typ: 'funke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, dauer: 0.6 + Math.random() * 0.3, farbe: pick(farben) });
    }
  }

  // ================= Update =================
  function update(dt) {
    if (!S) return;
    S.effekte.forEach((e) => {
      e.t += dt;
      if (e.typ === 'funke') { e.vy += 600 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }
    });
    S.effekte = S.effekte.filter((e) => e.t < e.dauer);
    S.wackeln = Math.max(0, S.wackeln - dt);
    S.flamme = Math.max(0, S.flamme - dt);
    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }

    if (S.zustand === 'fertig' || S.zustand === 'gameover') {
      S.fertigT -= dt;
      bewegeTeile(dt, true);
      if (S.fertigT <= 0 && !S.ergebnisGezeigt) { S.ergebnisGezeigt = true; zeigeErgebnis(); }
      return;
    }
    if (S.zustand !== 'spiel' || S.pause) return;

    S.zeit += dt;
    const st = S.studi;
    st.kick = Math.max(0, st.kick - dt);
    st.getroffen = Math.max(0, st.getroffen - dt);
    if (st.sprung >= 0) {
      const unter = S.teile.some((p) => p.entschieden === 'ueber' && p.x - p.w / 2 < STUDI_X + 32 && p.x + p.w / 2 > STUDI_X - 32);
      if (st.sprung >= SPRUNG_T / 2 && unter && st.hover < 2.5) st.hover += dt;
      else st.sprung += dt;
      if (st.sprung >= SPRUNG_T) { st.sprung = -1; st.hover = 0; }
    }
    S.bug.wurf = Math.max(0, S.bug.wurf - dt);
    spawn(dt);
    bewegeTeile(dt, false);
  }

  function bewegeTeile(dt, nurEffekte) {
    const v = S.aufgabe ? tempo() : 120;
    for (const p of S.teile) {
      if (p.zustand === 'puff') {
        p.t += dt;
        p.skala = Math.max(0, 1 - p.t * 3);
        if (p.t > 0.35) p.weg = true;
      } else if (p.zustand === 'flug') {
        p.flugT += dt;
        p.vy += 1100 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        if (p.zielTonne) {
          p.skala = Math.max(0.25, 1 - p.flugT);
          if (p.flugT >= 0.7) { p.weg = true; inDieTonne(); }
        }
        if (p.x > W + 300 || p.y > H + 200) p.weg = true;
      } else if (nurEffekte) {
        continue;
      } else if (p.zustand === 'wurf') {
        p.t += dt;
        const q = Math.min(1, p.t / 0.5);
        if (q < 0.4) { p.x = WURF_X; p.y = WURF_Y; }
        else {
          const k = (q - 0.4) / 0.6;
          p.x = lerp(WURF_X, START_X, k);
          p.y = lerp(WURF_Y, rampY(R[0], START_X), k) - Math.sin(k * Math.PI) * 50;
        }
        if (q >= 1) { p.zustand = 'rutscht'; p.s = 0; p.seg = 0; }
      } else if (p.zustand === 'rutscht') {
        p.s += v * PFAD[Math.min(p.seg, PFAD.length - 1)].f * dt;
        if (p.s >= PFAD_LEN) { p.weg = true; inDieTonne(); continue; }
        const pos = pfadPos(p.s);
        p.x = pos.x; p.y = pos.y; p.seg = pos.seg;
        if (p.seg === PFAD.length - 1) p.skala = Math.max(0.2, 1 - pos.t);
        if (p.seg === SEG_UNTEN && !p.entschieden && p.x + p.w / 2 >= KONTAKT_X) {
          kontakt(p);
          if (S.zustand !== 'spiel') return;
        }
      }
    }
    S.teile = S.teile.filter((p) => !p.weg);
  }

  // ================= Zeichnen =================
  function zeichneTeil(p) {
    const sk = p.skala ?? 1;
    if (sk <= 0.02) return;
    const w = p.w * sk, h = p.h * sk;
    const bob = p.zustand === 'rutscht' && p.seg !== 1 && p.seg !== 3 ? Math.round(Math.sin(S.zeit * 9 + p.id) * 1) : 0;
    const cx = p.x, cy = p.y - h / 2 - 2 + bob;
    ctx.save();
    ctx.translate(cx, cy);
    if (p.rot) ctx.rotate(p.rot);
    if (p.kaffee) {
      ctx.scale(sk, sk);
      zeichneBecher(-22, -22);
      ctx.restore();
      return;
    }
    const x = Math.round(-w / 2), y = Math.round(-h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 4, y + 4, w, h);
    ctx.fillStyle = '#1d1a24'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#f4ecd6'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e0d4b4'; ctx.fillRect(x, y + h - 3 * sk, w, 3 * sk);
    ctx.fillStyle = '#d65a5a'; ctx.fillRect(x, y + 3 * sk, w, Math.max(1, 2 * sk));
    if (sk > 0.3) {
      ctx.font = `600 ${Math.round(p.gr * sk)}px ${FONT_CODE}`;
      ctx.fillStyle = '#1b1b1b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      p.zeilen.forEach((z, i) => ctx.fillText(z, x + 11 * sk, y + (8 + i * p.zh) * sk));
    }
    ctx.restore();
  }

  /** Kaffeebecher (Extraleben), 44×44 */
  function zeichneBecher(x, y) {
    const puls = 0.5 + 0.5 * Math.sin(performance.now() / 150);
    ctx.fillStyle = `rgba(255,224,102,${0.25 + 0.25 * puls})`;
    ctx.beginPath(); ctx.arc(x + 22, y + 24, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d1a24';
    ctx.fillRect(x + 5, y + 13, 28, 29); ctx.fillRect(x + 31, y + 18, 10, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7, y + 15, 24, 25);
    ctx.fillRect(x + 31, y + 20, 8, 3); ctx.fillRect(x + 36, y + 20, 3, 12); ctx.fillRect(x + 31, y + 29, 8, 3);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 9, y + 17, 20, 5);
    ctx.fillStyle = '#d65a5a'; ctx.fillRect(x + 7, y + 27, 24, 6);
    ctx.font = `800 9px ${FONT_UI}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+1', x + 19, y + 30.5);
    const d = Math.floor(performance.now() / 250) % 2;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(x + 12 + d * 3, y + 4, 3, 7); ctx.fillRect(x + 22 - d * 3, y, 3, 9);
  }

  function zeichneStudi(zeit) {
    const st = S ? S.studi : { sprung: -1, kick: 0, getroffen: 0 };
    const hoehe = S && S.zustand !== 'menu' ? sprungHoehe() : 0;
    if (st.getroffen > 0 && Math.floor(st.getroffen * 12) % 2 === 0) return;
    const frame = st.kick > 0 ? STUDI_KICK : hoehe > 0 ? STUDI_SPRUNG : STUDI_STEHEN;
    const x = STUDI_X - 35, y = STUDI_Y - 80 - Math.round(hoehe);
    sprite(frame, STUDI_PAL, x, y, SK);
    // Kaffeedampf
    const d = Math.floor(zeit * 4) % 2;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(x + 61 + d * 3, y + 40, 3, 6);
    ctx.fillRect(x + 65 - d * 3, y + 31, 3, 6);
  }

  function zeichneBug(zeit) {
    const wirft = S && S.bug && S.bug.wurf > 0;
    const frame = wirft ? BUG_WURF : Math.floor(zeit * 3) % 2 ? BUG_A : BUG_B;
    const hops = wirft ? -6 : Math.floor(zeit * 3) % 2 ? 0 : -2;
    sprite(frame, BUG_PAL, BUG_X, BUG_Y - 60 + hops, SK);
  }

  function zeichneTonne(zeit) {
    const { x, y, w, h } = TONNE;
    const stark = S && S.flamme > 0 ? 2.2 : 1;
    // Flammen
    for (let i = 0; i < 7; i++) {
      const fx = x + 1 + i * 8;
      const fh = Math.round(((6 + (Math.sin(zeit * 13 + i * 1.9) + 1) * 5) * stark) / 2) * 2;
      ctx.fillStyle = '#e8452c'; ctx.fillRect(fx, y - fh, 7, fh + 4);
      ctx.fillStyle = '#f7a531'; ctx.fillRect(fx + 1, y - fh * 0.7, 5, fh * 0.7 + 4);
      ctx.fillStyle = '#ffe066'; ctx.fillRect(fx + 2, y - fh * 0.35, 3, fh * 0.35 + 4);
    }
    ctx.fillStyle = '#111'; ctx.fillRect(x - 2, y, w + 4, h);
    ctx.fillStyle = '#2f9e4a'; ctx.fillRect(x, y + 2, w, h - 2);
    ctx.fillStyle = '#237a38';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 5 + i * 12, y + 10, 4, h - 14);
    ctx.fillStyle = '#111'; ctx.fillRect(x - 6, y - 2, w + 12, 8);
    ctx.fillStyle = '#4fd06c'; ctx.fillRect(x - 4, y, w + 8, 4);
    ctx.fillStyle = '#f4ecd6'; ctx.fillRect(x + 12, y + 14, w - 24, 14);
    ctx.font = `800 12px ${FONT_UI}`; ctx.fillStyle = '#1b5e20'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GC', x + w / 2, y + 21.5);
  }

  function tasse(x, y, voll) {
    ctx.fillStyle = voll ? '#ffffff' : '#4a4458';
    ctx.fillRect(x, y + 4, 14, 14);
    ctx.fillRect(x + 14, y + 7, 4, 2); ctx.fillRect(x + 16, y + 7, 2, 7); ctx.fillRect(x + 14, y + 12, 4, 2);
    if (voll) { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 2, y + 6, 10, 3); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 4, y - 2, 2, 4); ctx.fillRect(x + 8, y, 2, 3); }
  }

  function zeichneHUD() {
    ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = '#2b2438'; ctx.fillRect(0, 42, W, 2);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const feld = (label, wert, x, farbe = '#fff') => {
      ctx.font = `700 11px ${FONT_UI}`; ctx.fillStyle = '#f2c230'; ctx.fillText(label, x, 13);
      ctx.font = `800 19px ${FONT_CODE}`; ctx.fillStyle = farbe; ctx.fillText(wert, x, 31);
    };
    feld('PUNKTE', String(S.punkte).padStart(6, '0'), 14);
    feld('LEVEL', S.modus === 'karriere' ? `${S.pos + 1}/${S.liste.length}` : 'ÜBUNG', 150);
    feld('CODE', `${S.naechstes}/${S.aufgabe.teile.length}`, 290);
    feld('COMBO', mult() > 1 ? `x${mult()}` : '-', 410, mult() > 1 ? '#7fe08a' : '#777');
    ctx.font = `700 11px ${FONT_UI}`; ctx.fillStyle = '#f2c230'; ctx.fillText('KAFFEE', 740, 13);
    for (let i = 0; i < 5; i++) if (i < Math.max(S.leben, 3)) tasse(740 + i * 26, 21, i < S.leben);
    ctx.textAlign = 'right'; ctx.font = `600 11px ${FONT_UI}`; ctx.fillStyle = '#888';
    ctx.fillText(stumm ? 'Ton aus [M]' : 'Ton an [M]', W - 14, 13);
  }

  function zeichneEffekte() {
    for (const e of S.effekte) {
      const a = 1 - e.t / e.dauer;
      if (e.typ === 'funke') {
        ctx.globalAlpha = a; ctx.fillStyle = e.farbe; ctx.fillRect(Math.round(e.x), Math.round(e.y), 4, 4);
      } else {
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.font = `800 16px ${FONT_UI}`;
        const w = ctx.measureText(e.text).width;
        const x = clamp(e.x, w / 2 + 8, W - w / 2 - 8);
        const y = e.y - e.t * 30;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText(e.text, x + 2, y + 2);
        ctx.fillStyle = e.farbe; ctx.fillText(e.text, x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function zeichneBanner() {
    if (!S.banner) return;
    const b = S.banner;
    const m = H / 2;
    ctx.fillStyle = 'rgba(10,8,16,.78)'; ctx.fillRect(0, m - 56, W, 112);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `32px ${FONT_PIXEL}`;
    ctx.fillStyle = '#000'; ctx.fillText(b.text, W / 2 + 4, m - 14 + 4);
    ctx.fillStyle = b.text === 'GAME OVER' ? '#ff6b6b' : '#f2c230'; ctx.fillText(b.text, W / 2, m - 14);
    ctx.font = `600 20px ${FONT_UI}`; ctx.fillStyle = '#fff'; ctx.fillText(b.unter || '', W / 2, m + 30);
  }

  function zeichne(zeit) {
    ctx.setTransform(AUFL, 0, 0, AUFL, 0, 0);
    ctx.save();
    if (S && S.wackeln > 0) ctx.translate(Math.round((Math.random() - 0.5) * 8), Math.round((Math.random() - 0.5) * 6));
    ctx.drawImage(hintergrund, 0, 0, W, H);
    if (S) {
      // Kick-Zone dezent markieren
      if (S.zustand === 'spiel') {
        ctx.fillStyle = 'rgba(242,194,48,.10)';
        ctx.fillRect(KONTAKT_X - KICK_FENSTER, STUDI_Y - 80, KICK_FENSTER, 80);
      }
      for (const p of S.teile) if (p.zustand !== 'flug') zeichneTeil(p);
    }
    zeichneStudi(zeit);
    zeichneBug(zeit);
    zeichneTonne(zeit);
    if (S) {
      for (const p of S.teile) if (p.zustand === 'flug') zeichneTeil(p);
      zeichneEffekte();
    }
    ctx.restore();
    if (S && S.zustand !== 'menu') {
      zeichneHUD();
      zeichneBanner();
      if (S.pause) {
        ctx.fillStyle = 'rgba(10,8,16,.7)'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.font = `28px ${FONT_PIXEL}`; ctx.fillStyle = '#f2c230';
        ctx.fillText('PAUSE', W / 2, H / 2);
        ctx.font = `12px ${FONT_PIXEL}`; ctx.fillStyle = '#fff'; ctx.fillText('[P] WEITER', W / 2, H / 2 + 40);
      }
    }
  }

  // ================= Panel / Overlays =================
  function codeHTML(a, gefuellt, naechstes, neu) {
    return a.zeilen.map((z) => {
      let s = esc(z.indent);
      for (const seg of z.segs) {
        s += seg.luecke;
        if (seg.fix || gefuellt[seg.teil]) s += seg.teil === neu ? `<span class="neu">${hl(seg.text)}</span>` : hl(seg.text);
        else s += `<span class="luecke${seg.teil === naechstes ? ' aktiv' : ''}" style="width:${clamp(seg.text.length, 3, 16)}ch"></span>`;
      }
      return s;
    }).join('\n');
  }
  function renderCode(neu = -1) {
    $('code').innerHTML = codeHTML(S.aufgabe, S.gefuellt, S.naechstes, neu);
    const aktiv = $('code').querySelector('.aktiv');
    if (aktiv) aktiv.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function renderPanel() {
    $('aufgabeTitel').textContent = S.aufgabe.titel;
    $('aufgabeText').textContent = S.aufgabe.beschreibung;
    $('kopieren').disabled = true;
    $('bestenliste').innerHTML = bestenlisteHTML(hsKey(), 'BESTENLISTE');
    renderCode();
  }
  const hsKey = () => (S.modus === 'karriere' ? 'karriere' : 'aufgabe:' + S.aufgabe.datei);

  function bestenlisteHTML(key, titel) {
    const l = hsListe(key);
    if (!l.length) return `<h3>${esc(titel)}</h3><p class="leer">Noch keine Einträge – sei die/der Erste!</p>`;
    return `<h3>${esc(titel)}</h3><ol>${l.map((e, i) => `<li><span>${i + 1}.</span><span>${esc(e.name)}</span><span>${e.punkte}</span></li>`).join('')}</ol>`;
  }

  function zeigeOverlay(id) {
    for (const o of ['menu', 'erklaerung', 'ergebnis']) $(o).classList.toggle('versteckt', o !== id);
  }

  function zeigeErklaerung(p) {
    S.zustand = 'erklaerung';
    let warum = p.warum;
    if (!warum) {
      if (S.aufgabe.teile.some((t, i) => i > S.naechstes && t.norm === p.norm)) warum = 'Das Teil gehört zur Lösung – aber noch nicht an diese Stelle. Achte auf die Reihenfolge!';
      else if (S.aufgabe.teile.some((t, i) => i < S.naechstes && t.norm === p.norm)) warum = 'Dieses Teil ist schon eingebaut. Gesucht ist das nächste Stück.';
      else warum = 'Dieses Teil passt hier nicht.';
    }
    $('erklCode').textContent = p.text;
    $('erklText').textContent = warum;
    zeigeOverlay('erklaerung');
    $('erklWeiter').focus();
  }
  function weiterNachErklaerung() {
    if (!S || S.zustand !== 'erklaerung') return;
    zeigeOverlay(null);
    if (S.leben <= 0) gameOver();
    else S.zustand = 'spiel';
    cv.focus();
  }

  function zeigeErgebnis() {
    const geschafft = S.zustand === 'fertig';
    const letztes = S.pos >= S.liste.length - 1;
    const sessionEnde = !geschafft || letztes;
    $('ergTitel').textContent = geschafft ? (letztes && S.modus === 'karriere' ? '★ ALLE AUFGABEN GESCHAFFT ★' : '✓ BUILD SUCCESSFUL') : 'GAME OVER';
    $('ergTitel').style.color = geschafft ? '' : 'var(--rot)';
    $('ergUnter').textContent = S.aufgabe.titel + (geschafft ? ' – der Code ist rechts komplett und kopierbar.' : '');
    const zeilen = [];
    if (geschafft) {
      zeilen.push(['Code-Teile', S.levelPunkte]);
      zeilen.push(['Level-Bonus', 250]);
      zeilen.push([`Kaffee übrig (${S.leben} × 100)`, S.bonusLeben]);
      if (S.bonusFehlerfrei) zeilen.push(['Fehlerfrei!', S.bonusFehlerfrei]);
    }
    zeilen.push(['Fehler insgesamt', S.fehler]);
    $('ergStats').innerHTML = zeilen.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${b}</td></tr>`).join('') +
      `<tr class="summe"><td>PUNKTE GESAMT</td><td>${S.punkte}</td></tr>`;
    const hs = sessionEnde && hsQualifiziert(hsKey(), S.punkte);
    $('ergHighscore').classList.toggle('versteckt', !hs);
    $('ergName').value = letzterName();
    $('ergWeiter').textContent = !sessionEnde ? 'NÄCHSTE AUFGABE ▶' : 'NOCHMAL ↻';
    zeigeOverlay('ergebnis');
    if (hs) setTimeout(() => $('ergName').focus(), 50);
    else $('ergWeiter').focus();
    S.sessionEnde = sessionEnde;
  }

  function highscoreEintragen() {
    const name = ($('ergName').value || '').trim().toUpperCase().slice(0, 12) || 'ANONYM';
    hsEintragen(hsKey(), name, S.punkte);
    $('ergHighscore').classList.add('versteckt');
    $('bestenliste').innerHTML = bestenlisteHTML(hsKey(), 'BESTENLISTE');
    $('ergWeiter').focus();
  }

  function ergebnisWeiter() {
    if (!S.sessionEnde) {
      S.pos++;
      S.leben = Math.min(5, S.leben + 1);
      S.ergebnisGezeigt = false;
      starteLevel();
    } else {
      neuesSpiel(S.liste, S.modus);
    }
    cv.focus();
  }

  function zumMenu() {
    S = null;
    zeigeOverlay('menu');
    renderMenuPanel();
    baueMenu();
  }

  function renderMenuPanel() {
    $('aufgabeTitel').textContent = 'SO GEHT\'S';
    $('aufgabeText').innerHTML = '';
    $('aufgabeText').insertAdjacentHTML('beforeend',
      '<p class="anleitung">Der <b>Bug</b> wirft Code-Schnipsel die Rampen hinunter. ' +
      'Unten stehst du mit deinem Kaffee.<br><br>' +
      '<b>→ Kicken:</b> Passt das Teil als Nächstes in deine Lösung? Dann ab damit in den Code!<br>' +
      '<b>↑ Springen:</b> Alles andere lässt du unter dir durchrutschen – es landet im Garbage Collector.<br><br>' +
      'Falsch gekickt oder umgerannt? Das kostet einen Kaffee ☕. Fehlerfreie Serien geben einen Combo-Multiplikator.</p>');
    $('code').innerHTML = '<span class="ko">// Hier entsteht deine Lösung …</span>';
    $('kopieren').disabled = true;
    $('bestenliste').innerHTML = bestenlisteHTML('karriere', 'BESTENLISTE (ALLE AUFGABEN)');
  }

  function baueMenu() {
    const liste = $('aufgabenListe');
    liste.innerHTML = '';
    AUFGABEN.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = 'aufgabe-knopf';
      const best = hsListe('aufgabe:' + a.datei)[0];
      b.innerHTML = `${i + 1}. ${esc(a.titel)}<small>${a.teile.length} Teile${best ? ` · Rekord ${best.punkte} (${esc(best.name)})` : ''}</small>`;
      b.onclick = () => { neuesSpiel([i], 'einzeln'); cv.focus(); };
      liste.appendChild(b);
    });
    const da = AUFGABEN.length > 0;
    $('karriereBtn').classList.toggle('versteckt', !da);
    $('einzelTitel').classList.toggle('versteckt', !da);
  }

  async function kopieren() {
    if (!S) return;
    const text = SA.codeText(S.aufgabe);
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* nichts */ }
      ta.remove();
    }
    const b = $('kopieren');
    b.textContent = 'KOPIERT ✓';
    setTimeout(() => { b.textContent = 'KOPIEREN'; }, 1500);
  }

  // ================= Eingabe =================
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      if (e.key === 'Enter') { e.preventDefault(); highscoreEintragen(); }
      return;
    }
    const k = e.key;
    if (k === 'm' || k === 'M') { stumm = !stumm; return; }
    if (!S) return;
    if (S.zustand === 'erklaerung') {
      if (k === ' ' || k === 'Enter') { e.preventDefault(); if (!e.repeat) weiterNachErklaerung(); }
      return;
    }
    if (S.zustand === 'spiel') {
      if (k === 'ArrowUp' || k === ' ' || k === 'w' || k === 'W') { e.preventDefault(); if (!e.repeat) springe(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); if (!e.repeat) kick(); }
      else if (k === 'p' || k === 'P') S.pause = !S.pause;
      else if (k === 'Escape') zumMenu();
    } else if (k === 'Escape' && $('ergebnis').classList.contains('versteckt')) zumMenu();
  });
  addEventListener('blur', () => { if (S && S.zustand === 'spiel') S.pause = true; });
  const touch = (id, fn) => $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  touch('tSprung', springe);
  touch('tKick', kick);
  $('erklWeiter').onclick = weiterNachErklaerung;
  $('ergEintragen').onclick = highscoreEintragen;
  $('ergWeiter').onclick = ergebnisWeiter;
  $('ergMenu').onclick = zumMenu;
  $('kopieren').onclick = kopieren;
  $('karriereBtn').onclick = () => { neuesSpiel(AUFGABEN.map((_, i) => i), 'karriere'); cv.focus(); };
  cv.tabIndex = 0;

  // ================= Start =================
  let letzte = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - letzte) / 1000);
    letzte = t;
    update(dt);
    zeichne(t / 1000);
    requestAnimationFrame(loop);
  }

  async function ladeAufgaben() {
    const status = $('menuStatus');
    try {
      const r = await fetch('aufgaben/index.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('aufgaben/index.json nicht gefunden (HTTP ' + r.status + ')');
      const json = await r.json();
      const dateien = Array.isArray(json) ? json : json.aufgaben || [];
      const fehler = [];
      for (const d of dateien) {
        try {
          const rr = await fetch('aufgaben/' + d, { cache: 'no-cache' });
          if (!rr.ok) throw new Error(`${d}: nicht gefunden (HTTP ${rr.status})`);
          const a = SA.parseAufgabe(await rr.text(), d);
          a.warnungen.forEach((w) => fehler.push(`${d}: ${w}`));
          AUFGABEN.push(a);
        } catch (e) { fehler.push(e.message); }
      }
      if (fehler.length) { status.textContent = '⚠ ' + fehler.join('\n⚠ '); status.classList.add('fehler'); }
      else status.classList.add('versteckt');
      if (!AUFGABEN.length && !fehler.length) { status.textContent = 'In aufgaben/index.json sind keine Aufgaben eingetragen.'; status.classList.remove('versteckt'); }
    } catch (e) {
      status.classList.add('fehler');
      status.textContent = 'Die Aufgaben konnten nicht geladen werden: ' + e.message +
        '\n\nDas Spiel muss über einen Webserver laufen (nicht per Doppelklick). Lokal z. B.:\n  python3 -m http.server\nund dann http://localhost:8000 öffnen.';
    }
    baueMenu();
  }

  (async function init() {
    try { await Promise.all([document.fonts.load(`12px ${FONT_PIXEL}`)]); } catch (e) { /* Fallback-Schrift */ }
    baueHintergrund();
    renderMenuPanel();
    requestAnimationFrame(loop);
    await ladeAufgaben();
    // Debug-Hilfe: ?start=karriere oder ?start=0 startet direkt
    const st = new URLSearchParams(location.search).get('start');
    if (st && AUFGABEN.length) {
      if (st === 'karriere') neuesSpiel(AUFGABEN.map((_, i) => i), 'karriere');
      else neuesSpiel([clamp(parseInt(st, 10) || 0, 0, AUFGABEN.length - 1)], 'einzeln');
      // Test-Hilfe: ?sim=Sekunden simuliert vorab, &bot=1 lässt einen Bot spielen
      const q = new URLSearchParams(location.search);
      const sim = parseFloat(q.get('sim') || '0');
      for (let i = 0; i < sim * 60 && S; i++) {
        bot.falsch = q.get('bot') === '2';
        if (q.get('bot') && S.zustand === 'spiel') bot();
        if (S.zustand === 'erklaerung') { if (q.get('bot') === '2') break; weiterNachErklaerung(); }
        update(1 / 60);
        zeichne(i / 60);
      }
    }
  })();

  function bot() {
    for (const p of S.teile) {
      if (p.zustand !== 'rutscht' || p.seg !== SEG_UNTEN || p.entschieden) continue;
      const d = KONTAKT_X - (p.x + p.w / 2);
      if ((istZiel(p) || p.kaffee || bot.falsch) && d < 50) kick();
      else if (!istZiel(p) && d < 30) springe();
    }
  }

  // Für Tests von außen
  window.StackAttack = { get zustand() { return S; }, kick, springe };
})();
