/* Pixcel Galaxy - a standalone, configurable version of fxGalaxy from _tsPro/static/fx.js (lines 19-55).
   With the default options it draws exactly what the original draws; every hard-coded number became an option.

   Usage:
     const g = PixcelGalaxy(canvas, {n: 380, from: "disc", to: "galaxy"});
     g.set({arms: 5, palette: "fire"});   // change anything while it runs
     g.state();                           // {mix, spd, rot, fps, n}
     g.destroy();                         // stop the loop and remove listeners

   Add your own shape:
     PixcelGalaxy.shapes.myShape = (p, rot, o, out) => { out.x = ...; out.y = ...; out.z = 0; };

   Full explanation (Persian): docs.html */
(function (global) {
"use strict";
const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));   // 2.39996 rad = 137.5 deg, the sunflower angle (the original writes 2.39996)

const PALETTES = {
  tspro:   ["#8ab4f8", "#4285f4", "#1a73e8", "#00c2ff", "#a5d8ff", "#7c9cff", "#c3e6ff", "#5e97f6"],   // the original PAL
  nebula:  ["#c084fc", "#f472b6", "#818cf8", "#e879f9", "#a5b4fc", "#fbcfe8", "#7c3aed"],
  fire:    ["#ffd166", "#ff9f1c", "#ff6b35", "#ff4e00", "#ffb4a2", "#ffe8a3"],
  aurora:  ["#64ffda", "#00e5a0", "#00c2ff", "#7cffcb", "#4dd0e1", "#b2ff59"],
  rainbow: ["#ff5f6d", "#ffc371", "#fff176", "#69f0ae", "#40c4ff", "#7c4dff", "#ea80fc"],
  mono:    ["#ffffff", "#e5e7eb", "#cbd5e1", "#94a3b8"]
};

const DEFAULTS = {
  n: 380,               // number of dots                                  (original: o.n || 380)
  from: "disc",         // rest shape A                                    (original: phyllotaxis circle)
  to: "galaxy",         // target shape B                                  (original: spiral galaxy)
  // galaxy shape
  arms: 3,              // spiral arms                                     (original: ARMS = 3)
  twist: 4.4,           // how far an arm winds from centre to edge, rad   (original: gr*4.4)
  scatter: .9,          // random spread around an arm                     (original: .9 - .5*gr)
  flatten: .58,         // y squash, makes the disc look seen from an angle (original: *.58)
  tilt: -.38,           // rotation of the whole galaxy, rad               (original: tilt = -.38)
  diffRot: 1.5,         // inner stars turn faster than outer ones         (original: rot*(1.5/(gr+.3)))
  radiusBias: .65,      // <1 pushes stars outwards, >1 packs the centre   (original: pow(random, .65))
  // text shape
  text: "PIXCEL",
  textFont: "800 200px system-ui, Tahoma, sans-serif",
  shape: "human-face-front", // drawing used by the image shape
  petals: 6,            // number of flower petals (also used by the docs demo)
  // size
  radius: .44,          // shape radius as a fraction of min(width,height) (original: .44)
  sizeMin: .5, sizeRange: 1.5, sizeGrow: .35,   // dot radius = (sizeMin + rnd*sizeRange) * (.85 + sizeGrow*m)
  // motion
  speed: .0035,         // base rotation per frame, rad                    (original: .0035)
  hoverBoost: 2.6,      // extra speed when fully morphed                  (original: 1 + mix*2.6)
  boostSpeed: 3.2,      // speed while "boost" (AI working) is on          (original: 3.2)
  ease: .045,           // how fast mix follows its target, per frame      (original: .045)
  speedEase: .04,       // how fast speed follows its target               (original: .04)
  follow: .22,          // how fast a dot follows its target point         (original: .22)
  // morph A -> B
  trigger: "hover",     // hover | click | auto | manual | always | never  (original: hover)
  autoPeriod: 4,        // seconds per state when trigger = auto
  manual: 0,            // mix 0..1 when trigger = manual
  stagger: .7,          // 0 = all dots morph together; bigger = more of a wave (original: mix*1.7 - gr*.7)
  order: "center",      // center | edge | random | sweep | none           (original: center)
  boost: false,         // same as the original's body.fx-ai: forces the galaxy and the fast spin
  // mouse
  mouse: "repel",       // repel | attract | swirl | off                   (original: repel)
  mouseRadius: 60,      // px                                              (original: d2 < 3600 -> 60px)
  mouseForce: 14,       // px                                              (original: *14)
  clickShock: false,    // a click sends a shock wave through the dots
  shockForce: 28,
  // colour and light
  palette: "tspro",     // a PALETTES name or an array of colours
  colorMode: "cycle",   // cycle | random | radius | angle                 (original: cycle, PAL[i % 8])
  blend: "lighter",     // canvas composite op for dots and glow           (original: lighter)
  glow: true, glowStrength: 1,
  twinkle: 650,         // ms scale of the sine that makes dots blink      (original: now/650)
  alphaBase: .45, alphaAmp: .45,                // alpha = base + amp*sin(...) (original: .45 + .45*sin)
  trail: 0,             // 0 = clear every frame; .9 = long motion trails
  host: null,           // element that receives the mouse (original: o.host || canvas)
  reduceMotion: null    // null = follow the OS setting
};

/* ---------------------------------------------------------------- shapes
   A shape places one particle p at rotation `rot`.
   It writes unit coordinates to `out`: x,y roughly in [-1,1] (y grows downwards), z in [-1,1] = depth (0 for flat shapes).
   p carries stable seeds: i (index), N (count), u = (i+.5)/N, r1..r4 random numbers in [0,1).
   An optional shape.key(p, o) gives the 0..1 "distance from centre" used by order = center. */
const shapes = {
  // A: sunflower / phyllotaxis. r = sqrt(u) gives equal density, the golden angle avoids visible spokes.
  disc(p, rot, o, out) {
    const r = Math.sqrt(p.u), a = p.i * GOLDEN + rot;
    out.x = Math.cos(a) * r; out.y = Math.sin(a) * r; out.z = 0;
  },

  // B: spiral galaxy, the original maths
  galaxy(p, rot, o, out) {
    const gr = Math.pow(p.r1, o.radiusBias);                         // distance from centre 0..1
    const arm = (p.i % o.arms) * TAU / o.arms;                       // which arm
    const jitter = (p.r2 - .5) * Math.max(0, o.scatter - .5 * gr);   // spread, narrower at the edge
    const ga = arm + gr * o.twist + jitter + rot * (o.diffRot / (gr + .3));
    const x0 = Math.cos(ga) * gr, y0 = Math.sin(ga) * gr * o.flatten;
    const ct = Math.cos(o.tilt), st = Math.sin(o.tilt);              // 2D rotation matrix
    out.x = x0 * ct - y0 * st; out.y = x0 * st + y0 * ct; out.z = 0;
  },

  ring(p, rot, o, out) {
    const r = .82 + (p.r2 - .5) * .16, a = p.u * TAU + rot;
    out.x = Math.cos(a) * r; out.y = Math.sin(a) * r; out.z = 0;
  },

  // Fibonacci sphere turning around the vertical axis, tilted towards the viewer by o.tilt
  sphere(p, rot, o, out) {
    const y = 1 - 2 * p.u, rr = Math.sqrt(1 - y * y), th = p.i * GOLDEN + rot;
    const x = Math.cos(th) * rr, z = Math.sin(th) * rr;
    const ct = Math.cos(o.tilt), st = Math.sin(o.tilt);
    out.x = x; out.y = y * ct - z * st; out.z = y * st + z * ct;
  },

  heart(p, rot, o, out) {
    const t = p.u * TAU, s = Math.sin(t);
    const fill = p.r2 < .6 ? 1 - .05 * p.r3 : Math.sqrt(p.r3);      // 60% on the outline, the rest inside
    const beat = 1 + .07 * Math.pow(Math.abs(Math.sin(rot * 2.5)), 8);
    const k = fill * beat / 17;
    out.x = 16 * s * s * s * k;
    out.y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k - .1;
    out.z = 0;
  },

  // 5-point star: walk the 10-vertex outline with straight edges, then turn it
  star(p, rot, o, out) {
    const f10 = p.u * 10, k = Math.floor(f10), f = f10 - k;
    const vtx = j => { const a = j * TAU / 10 - Math.PI / 2, r = j % 2 ? .42 : 1; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const [ax, ay] = vtx(k), [bx, by] = vtx(k + 1);
    const fill = p.r2 < .65 ? 1 : Math.sqrt(p.r3);
    const x = (ax + (bx - ax) * f) * fill, y = (ay + (by - ay) * f) * fill, a = rot * .5;
    out.x = x * Math.cos(a) - y * Math.sin(a); out.y = x * Math.sin(a) + y * Math.cos(a); out.z = 0;
  },

  grid(p, rot, o, out) {
    const side = Math.ceil(Math.sqrt(p.N)), col = p.i % side, row = Math.floor(p.i / side);
    const x = (col / Math.max(1, side - 1) * 2 - 1) * .78, y = (row / Math.max(1, side - 1) * 2 - 1) * .78, a = rot * .3;
    out.x = x * Math.cos(a) - y * Math.sin(a); out.y = x * Math.sin(a) + y * Math.cos(a); out.z = 0;
  },

  // DNA double helix: odd and even dots sit on two strands half a turn apart
  helix(p, rot, o, out) {
    const x = (p.u * 2 - 1) * .95, ph = x * TAU * 1.1 + rot * 3 + (p.i % 2) * Math.PI;
    out.x = x; out.y = Math.sin(ph) * .32 + (p.r2 - .5) * .05; out.z = Math.cos(ph);
  },

  // dots fill the pixels of a text drawn on a hidden canvas
  text(p, rot, o, out) {
    const pts = textPoints(o.text, o.textFont);
    if (!pts.length) { out.x = out.y = out.z = 0; return; }
    const q = pts[Math.floor(p.u * pts.length)];
    out.x = q[0] + Math.cos(rot * 6 + p.r3 * TAU) * .006; out.y = q[1] + Math.sin(rot * 6 + p.r3 * TAU) * .006; out.z = 0;
  }
};
shapes.galaxy.key = (p, o) => Math.pow(p.r1, o.radiusBias);       // the original orders the morph by gr

// Extra geometric shapes. Coordinates stay within the same unit circle as the original shapes.
function turn(out, x, y, z, angle) {
  out.x = x * Math.cos(angle) - z * Math.sin(angle);
  out.y = y;
  out.z = x * Math.sin(angle) + z * Math.cos(angle);
}
function polygon(p, rot, out, sides) {
  const edge = p.u * sides, k = Math.floor(edge), f = edge - k;
  const a = k * TAU / sides - Math.PI / 2, b = (k + 1) * TAU / sides - Math.PI / 2;
  const r = p.r2 < .7 ? 1 : Math.sqrt(p.r3), t = rot * .3;
  const x = (Math.cos(a) * (1 - f) + Math.cos(b) * f) * r;
  const y = (Math.sin(a) * (1 - f) + Math.sin(b) * f) * r;
  out.x = x * Math.cos(t) - y * Math.sin(t);
  out.y = x * Math.sin(t) + y * Math.cos(t); out.z = 0;
}
shapes.triangle = (p, rot, o, out) => polygon(p, rot, out, 3);
shapes.square = (p, rot, o, out) => polygon(p, rot, out, 4);
shapes.hexagon = (p, rot, o, out) => polygon(p, rot, out, 6);
shapes.pyramid = (p, rot, o, out) => {
  const v = [[0, -.95, 0], [-.85, .65, -.5], [.85, .65, -.5], [0, .65, .85]];
  const e = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]][p.i % 6];
  const a = v[e[0]], b = v[e[1]], f = p.r1;
  turn(out, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, rot);
};
shapes.cube = (p, rot, o, out) => {
  const edge = p.i % 12, axis = Math.floor(edge / 4), f = p.r1 * 1.5 - .75;
  const a = (edge % 4 & 1) ? .75 : -.75, b = (edge % 4 & 2) ? .75 : -.75;
  turn(out, axis === 0 ? f : a, axis === 1 ? f : axis === 0 ? a : b,
    axis === 2 ? f : b, rot);
};
shapes.torus = (p, rot, o, out) => {
  const a = p.i * GOLDEN, b = p.u * TAU * 19;
  const r = .68 + .27 * Math.cos(b);
  turn(out, r * Math.cos(a), .27 * Math.sin(b), r * Math.sin(a), rot);
};
shapes.spiral = (p, rot, o, out) => {
  const a = p.u * TAU * 4 + rot;
  out.x = p.u * Math.cos(a); out.y = p.u * Math.sin(a); out.z = 0;
};
shapes.flower = (p, rot, o, out) => {
  const a = p.u * TAU, r = .25 + .7 * Math.abs(Math.cos((o.petals || 6) * a / 2));
  const f = p.r2 < .75 ? 1 : Math.sqrt(p.r3);
  out.x = r * f * Math.cos(a + rot * .3); out.y = r * f * Math.sin(a + rot * .3); out.z = 0;
};
shapes.mandala = (p, rot, o, out) => {
  const a = p.u * TAU * 7 + rot * .2, r = .55 + .35 * Math.cos(8 * a);
  out.x = r * Math.cos(a); out.y = r * Math.sin(a); out.z = 0;
};
shapes.infinity = (p, rot, o, out) => {
  const a = p.u * TAU;
  out.x = .92 * Math.sin(a); out.y = .65 * Math.sin(2 * a); out.z = .2 * Math.cos(a + rot);
};
shapes.butterfly = (p, rot, o, out) => {
  const a = p.u * TAU * 4, r = Math.exp(Math.cos(a)) - 2 * Math.cos(4 * a) - Math.pow(Math.sin(a / 12), 5);
  out.x = .24 * r * Math.sin(a); out.y = -.24 * r * Math.cos(a); out.z = .15 * Math.sin(rot * 2) * Math.sign(out.x);
};
shapes.atom = (p, rot, o, out) => {
  const a = p.u * TAU, orbit = p.i % 3 * TAU / 3;
  turn(out, .9 * Math.cos(a) * Math.cos(orbit), .9 * Math.sin(a), .9 * Math.cos(a) * Math.sin(orbit), rot);
};
shapes.crescent = (p, rot, o, out) => {
  const a = p.u * TAU, r = .65 + .18 * Math.cos(a);
  out.x = r * Math.cos(a) - .18; out.y = r * Math.sin(a); out.z = 0;
};
shapes.wave = (p, rot, o, out) => {
  out.x = p.u * 1.9 - .95; out.y = Math.sin(out.x * Math.PI * 3 + rot * 2) * (.35 + p.r2 * .18);
  out.z = Math.cos(out.x * Math.PI * 3 + rot * 2) * .3;
};

// Portraits are sampled from locally drawn canvas paths, not external images.
const imageCache = new Map();
function imagePoints(name) {
  if (imageCache.has(name)) return imageCache.get(name);
  const c = document.createElement("canvas"); c.width = c.height = 320;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.translate(160, 160); x.strokeStyle = "#fff"; x.fillStyle = "#fff"; x.lineWidth = 3;
  const path = (coords, close = false) => {
    x.beginPath(); x.moveTo(coords[0], coords[1]);
    for (let i = 2; i < coords.length; i += 2) x.lineTo(coords[i], coords[i + 1]);
    if (close) x.closePath(); x.stroke();
  };
  const oval = (cx, cy, rx, ry, fill = false) => {
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); fill ? x.fill() : x.stroke();
  };
  if (name === "human-face-front") {
    oval(0, 0, 91, 124); path([-90, -42, -104, -52, -105, -16, -90, 2]);
    path([90, -42, 104, -52, 105, -16, 90, 2]);
    x.lineWidth = 7; path([-65, -54, -42, -64, -17, -56]); path([17, -56, 42, -64, 65, -54]);
    x.lineWidth = 3; oval(-40, -39, 20, 9); oval(40, -39, 20, 9);
    oval(-40, -39, 6, 7, true); oval(40, -39, 6, 7, true);
    path([0, -27, -12, 20, 0, 27, 12, 20]);
    path([-33, 61, -15, 56, 0, 58, 15, 56, 33, 61]);
    path([-27, 66, 0, 75, 27, 66]); path([-24, 86, 0, 92, 24, 86]);
    path([-85, -56, -66, -104, -30, -116, 0, -122, 30, -116, 66, -104, 85, -56]);
  } else if (name === "cat-face-front") {
    path([-94, -37, -109, -127, -44, -93, 0, -99, 44, -93, 109, -127, 94, -37], false);
    path([-94, -37, -100, 29, -71, 91, -23, 115, 0, 112, 23, 115, 71, 91, 100, 29, 94, -37]);
    path([-90, -106, -76, -70, -55, -84]); path([90, -106, 76, -70, 55, -84]);
    oval(-43, -19, 24, 15); oval(43, -19, 24, 15);
    oval(-43, -19, 5, 13, true); oval(43, -19, 5, 13, true);
    path([-17, 38, 0, 49, 17, 38, -17, 38]);
    path([0, 49, 0, 64, -15, 72, -29, 63]); path([0, 64, 15, 72, 29, 63]);
    for (const side of [-1, 1]) for (let j = -1; j <= 1; j++)
      path([side * 30, 61 + j * 8, side * 111, 55 + j * 20]);
  } else if (name === "skull-front") {
    oval(0, -26, 89, 99); path([-72, 35, -64, 102, -38, 118, 38, 118, 64, 102, 72, 35]);
    oval(-37, -25, 23, 29); oval(37, -25, 23, 29);
    path([0, 7, -11, 43, 11, 43, 0, 7], true);
    path([-42, 76, 42, 76]);
    for (let i = -3; i <= 3; i++) path([i * 11, 77, i * 10, 114]);
  } else if (name === "eye") {
    path([-124, 0, -70, -52, 0, -72, 70, -52, 124, 0, 70, 52, 0, 72, -70, 52, -124, 0]);
    oval(0, 0, 51, 51); oval(0, 0, 21, 21, true);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      path([Math.cos(a) * 54, Math.sin(a) * 54, Math.cos(a) * 67, Math.sin(a) * 67]);
    }
  } else { // smiley
    oval(0, 0, 114, 114); oval(-41, -34, 9, 16, true); oval(41, -34, 9, 16, true);
    x.beginPath(); x.arc(0, -5, 71, .15 * Math.PI, .85 * Math.PI); x.stroke();
  }
  const d = x.getImageData(0, 0, 320, 320).data, pts = [];
  for (let py = 12; py < 308; py += 2) for (let px = 12; px < 308; px += 2)
    if (d[(py * 320 + px) * 4 + 3] > 128) pts.push([(px - 160) / 128, (py - 160) / 128]);
  imageCache.set(name, pts);
  return pts;
}
shapes.image = (p, rot, o, out) => {
  const pts = imagePoints(o.shape);
  if (!pts.length) { out.x = out.y = out.z = 0; return; }
  const q = pts[Math.floor(p.r1 * pts.length)];
  out.x = q[0]; out.y = q[1]; out.z = 0;
};

const textCache = new Map();   // "text|font" -> points, so several canvases with different texts do not redraw every frame
function textPoints(text, font) {
  const key = text + "|" + font;
  if (textCache.has(key)) return textCache.get(key);
  const W = 640, H = 320, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  let size = parseFloat((font.match(/(\d+(\.\d+)?)px/) || [0, 200])[1]);
  const setFont = () => x.font = font.replace(/\d+(\.\d+)?px/, size + "px");
  setFont();
  while (size > 10 && x.measureText(text).width > W * .92) { size -= 4; setFont(); }   // shrink to fit
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, W / 2, H / 2);
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let py = 0; py < H; py += 3) for (let px = 0; px < W; px += 3)
    if (d[(py * W + px) * 4 + 3] > 128) pts.push([(px - W / 2) / (W / 2), (py - H / 2) / (W / 2)]);
  textCache.set(key, pts);
  return pts;
}

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hexRGB = h => { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

/* ---------------------------------------------------------------- engine */
function PixcelGalaxy(cv, opts) {
  const o = Object.assign({}, DEFAULTS, opts || {});
  const ctx = cv.getContext("2d"), P = [];
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 }, tmp = { x: 0, y: 0, z: 0 };
  let mix = 0, hover = 0, toggled = 0, rot = 0, spd = 1, mx = -1e4, my = -1e4, last = performance.now(), vis = true, w = 0, h = 0;
  let raf = 0, dead = false, fps = 60, pal = [], glowRGB = [], shocks = [];
  const reduceOS = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function seed(i) { return { i, N: 0, u: 0, r1: Math.random(), r2: Math.random(), r3: Math.random(), r4: Math.random(), tw: Math.random() * TAU, x: NaN, y: NaN, k: 0, c: "#fff" }; }

  // grow or shrink the particle list but keep the dots that already exist (so changing n does not jump)
  function resizeParticles() {
    const n = Math.max(1, Math.round(o.n));
    while (P.length < n) P.push(seed(P.length));
    P.length = n;
    for (const p of P) { p.N = n; p.u = (p.i + .5) / n; }
  }

  // values that only change when options change: palette, colour per dot, morph order key per dot
  function refresh() {
    pal = Array.isArray(o.palette) ? o.palette : (PALETTES[o.palette] || PALETTES.tspro);
    glowRGB = [0, 1, 2].map(i => hexRGB(pal[i % pal.length]));
    const B = shapes[o.to] || shapes.galaxy;
    for (const p of P) {
      B(p, 0, o, tmp);
      const dist = B.key ? B.key(p, o) : clamp01(Math.hypot(tmp.x, tmp.y));
      p.k = o.order === "edge" ? 1 - dist : o.order === "random" ? p.r3 : o.order === "sweep" ? clamp01((tmp.x + 1) / 2) : o.order === "none" ? 0 : dist;
      const ci = o.colorMode === "random" ? Math.floor(p.r3 * pal.length)
        : o.colorMode === "radius" ? Math.floor(dist * pal.length)
        : o.colorMode === "angle" ? Math.floor(((Math.atan2(tmp.y, tmp.x) / TAU + 1) % 1) * pal.length)
        : p.i % pal.length;
      p.c = pal[Math.min(pal.length - 1, ci)];
    }
  }

  const host = o.host || cv;
  const pos = e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
  const onEnter = e => { hover = 1; pos(e); };
  const onLeave = () => { hover = 0; mx = my = -1e4; };
  const onDown = e => {
    pos(e);
    if (o.trigger === "click") toggled = toggled ? 0 : 1;
    if (o.clickShock) shocks.push({ x: mx, y: my, t: performance.now() });
  };
  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("pointermove", pos);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointerdown", onDown);
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => vis = es[0].isIntersecting) : null;
  if (io) io.observe(cv);

  function frame(now) {
    if (dead || !cv.isConnected) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, now - last) / 16.67;   // 1.0 at 60 fps, 2.0 at 30 fps: motion speed does not depend on the screen
    fps += (1000 / Math.max(1, now - last) - fps) * .05;
    last = now;
    if (!vis || document.hidden) return;

    // canvas pixels = CSS size * devicePixelRatio (max 2), re-measured every frame
    const dpr = Math.min(2, devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
    if (cw != w || ch != h) { w = cw; h = ch; cv.width = w * dpr; cv.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (o.trail > 0) {   // fade the last frame instead of erasing it -> trails
      ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0,0,0,${1 - o.trail})`; ctx.fillRect(0, 0, w, h);
    } else ctx.clearRect(0, 0, w, h);

    // 1. mix: 0 = shape A, 1 = shape B. It eases towards "want".
    const boost = o.boost || document.body.classList.contains("fx-ai");
    let want = o.trigger === "hover" ? hover
      : o.trigger === "click" ? toggled
      : o.trigger === "auto" ? Math.floor(now / 1000 / Math.max(.2, o.autoPeriod)) % 2
      : o.trigger === "always" ? 1
      : o.trigger === "manual" ? o.manual : 0;
    if (boost) want = 1;
    if (o.trigger === "manual" && !boost) mix = o.manual;
    else mix += (want - mix) * o.ease * dt;

    // 2. speed eases too; rot is the shared rotation every shape uses
    spd += ((boost ? o.boostSpeed : 1 + mix * o.hoverBoost) - spd) * o.speedEase * dt;
    const reduce = o.reduceMotion == null ? reduceOS : o.reduceMotion;
    rot += o.speed * spd * dt * (reduce ? .25 : 1);

    // 3. soft glow behind the dots
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * o.radius;
    ctx.globalCompositeOperation = o.blend;
    if (o.glow && o.glowStrength > 0) {
      const gs = o.glowStrength * (1 - o.trail * .9), [c0, c1, c2] = glowRGB;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (.55 + .25 * mix));
      g.addColorStop(0, `rgba(${c0},${(.30 + .35 * mix) * gs})`);
      g.addColorStop(.4, `rgba(${c1},${(.10 + .18 * mix) * gs})`);
      g.addColorStop(1, `rgba(${c2},0)`);
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    // 4. the dots
    const A = shapes[o.from] || shapes.disc, B = shapes[o.to] || shapes.galaxy;
    const mr2 = o.mouseRadius * o.mouseRadius, k1 = 1 + o.stagger;
    shocks = shocks.filter(s => now - s.t < 900);
    const shockR = Math.max(w, h) * .8;
    for (const p of P) {
      A(p, rot, o, a); B(p, rot, o, b);
      let m = clamp01(mix * k1 - p.k * o.stagger); m = m * m * (3 - 2 * m);   // per-dot morph + smoothstep
      let x = cx + R * (a.x + (b.x - a.x) * m), y = cy + R * (a.y + (b.y - a.y) * m);
      const z = a.z + (b.z - a.z) * m;

      if (o.mouse !== "off" && mr2 > 0) {
        const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        if (d2 < mr2) {
          const d = Math.sqrt(d2) || 1, f = (mr2 - d2) / mr2 * o.mouseForce;   // strongest at the cursor, 0 at the edge
          if (o.mouse === "repel") { x += dx / d * f; y += dy / d * f; }
          else if (o.mouse === "attract") { const g = Math.min(f, d); x -= dx / d * g; y -= dy / d * g; }
          else { x += -dy / d * f; y += dx / d * f; }                          // swirl: push sideways
        }
      }
      for (const s of shocks) {
        const age = (now - s.t) / 900, dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy) || 1, band = 46;
        const off = Math.abs(d - age * shockR);
        if (off < band) { const f = (1 - off / band) * o.shockForce * (1 - age); x += dx / d * f; y += dy / d * f; }
      }

      // the dot does not jump to its target, it moves a fraction of the way each frame
      if (isNaN(p.x)) { p.x = x; p.y = y; }
      else { const f = Math.min(1, o.follow * dt); p.x += (x - p.x) * f; p.y += (y - p.y) * f; }

      ctx.globalAlpha = clamp01((o.alphaBase + o.alphaAmp * Math.sin(now / o.twinkle + p.tw)) * (1 + .3 * z));
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(.1, (o.sizeMin + p.r4 * o.sizeRange) * (.85 + o.sizeGrow * m) * (1 + .3 * z)), 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  resizeParticles(); refresh();
  raf = requestAnimationFrame(frame);

  const api = {
    set(patch) {
      Object.assign(o, patch);
      if ("text" in patch || "textFont" in patch) textPoints(o.text, o.textFont);
      resizeParticles(); refresh();
      return api;
    },
    options() { const c = Object.assign({}, o); delete c.host; return c; },
    state() { return { mix, spd, rot, fps, n: P.length }; },
    toggle() { toggled = toggled ? 0 : 1; return api; },
    shock(x, y) { shocks.push({ x: x == null ? w / 2 : x, y: y == null ? h / 2 : y, t: performance.now() }); return api; },
    scramble() { for (const p of P) { p.x = Math.random() * w; p.y = Math.random() * h; } return api; },
    destroy() {
      dead = true; cancelAnimationFrame(raf); if (io) io.disconnect();
      host.removeEventListener("pointerenter", onEnter); host.removeEventListener("pointermove", pos);
      host.removeEventListener("pointerleave", onLeave); host.removeEventListener("pointerdown", onDown);
    }
  };
  return api;
}

PixcelGalaxy.shapes = shapes;
PixcelGalaxy.palettes = PALETTES;
PixcelGalaxy.defaults = DEFAULTS;
global.PixcelGalaxy = PixcelGalaxy;
})(window);
