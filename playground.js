/* Playground UI: builds the control panel from SCHEMA, keeps the config in localStorage / the URL hash,
   and passes every change to the engine with g.set({...}). The engine itself is galaxy.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const D = PixcelGalaxy.defaults;
const SHAPES = { disc: "دایره‌ی آفتابگردانی", galaxy: "کهکشان مارپیچی", ring: "حلقه", sphere: "کره‌ی سه‌بعدی", heart: "قلب", star: "ستاره", grid: "شبکه", helix: "مارپیچ DNA", text: "متن", triangle: "مثلث", square: "مربع", hexagon: "شش‌ضلعی", cube: "مکعب", pyramid: "هرم", torus: "توروس", spiral: "مارپیچ", flower: "گل", mandala: "ماندالا", infinity: "بی‌نهایت", butterfly: "پروانه", atom: "اتم", crescent: "هلال ماه", wave: "موج سینوسی", image: "چهره و تصویر خطی" };
const has = (c, s) => c.from === s || c.to === s;

/* every control: k = option name, t = type, label, range, optional show(config) */
const SCHEMA = [
  { sec: "شکل‌ها" },
  { k: "from", t: "select", label: "شکل آرام (A)", opts: SHAPES },
  { k: "to", t: "select", label: "شکل مقصد (B)", opts: SHAPES },
  { k: "text", t: "text", label: "متن", show: c => has(c, "text") },
  { k: "textFont", t: "text", label: "فونت متن", show: c => has(c, "text") },
  { k: "petals", t: "range", label: "تعداد گلبرگ", min: 2, max: 16, step: 1, show: c => has(c, "flower") },
  { k: "shape", t: "select", label: "طرح چهره", opts: { "human-face-front": "چهره انسان", "cat-face-front": "چهره گربه", "skull-front": "جمجمه", eye: "چشم", smiley: "صورتک" }, show: c => has(c, "image") },
  { sec: "کهکشان", show: c => has(c, "galaxy") || has(c, "sphere") },
  { k: "arms", t: "range", label: "تعداد بازو", min: 1, max: 8, step: 1, show: c => has(c, "galaxy") },
  { k: "twist", t: "range", label: "پیچش بازوها", min: 0, max: 14, step: .1, show: c => has(c, "galaxy") },
  { k: "scatter", t: "range", label: "پراکندگی", min: 0, max: 2.5, step: .05, show: c => has(c, "galaxy") },
  { k: "radiusBias", t: "range", label: "توزیع شعاعی", min: .2, max: 2.5, step: .05, show: c => has(c, "galaxy") },
  { k: "diffRot", t: "range", label: "چرخش تفاضلی", min: 0, max: 5, step: .1, show: c => has(c, "galaxy") },
  { k: "flatten", t: "range", label: "پهن‌شدگی (y)", min: .1, max: 1, step: .01, show: c => has(c, "galaxy") },
  { k: "tilt", t: "range", label: "زاویه‌ی کج (°)", min: -90, max: 90, step: 1, deg: true },
  { sec: "تعداد و اندازه" },
  { k: "n", t: "range", label: "تعداد ذرات", min: 20, max: 5000, step: 10 },
  { k: "radius", t: "range", label: "شعاع شکل", min: .1, max: .5, step: .01 },
  { k: "sizeMin", t: "range", label: "کوچک‌ترین نقطه", min: .1, max: 4, step: .1 },
  { k: "sizeRange", t: "range", label: "تنوع اندازه", min: 0, max: 6, step: .1 },
  { k: "sizeGrow", t: "range", label: "بزرگ‌شدن در تبدیل", min: 0, max: 2, step: .05 },
  { sec: "حرکت" },
  { k: "speed", t: "range", label: "سرعت پایه", min: -.02, max: .03, step: .0005 },
  { k: "hoverBoost", t: "range", label: "شتاب در حالت B", min: 0, max: 10, step: .1 },
  { k: "boostSpeed", t: "range", label: "سرعت حالت AI", min: 0, max: 12, step: .1 },
  { k: "follow", t: "range", label: "نرمی دنبال‌کردن", min: .02, max: 1, step: .01 },
  { k: "ease", t: "range", label: "سرعت تبدیل", min: .005, max: .3, step: .005 },
  { k: "speedEase", t: "range", label: "نرمی تغییر سرعت", min: .005, max: .3, step: .005 },
  { sec: "تبدیل A → B" },
  { k: "trigger", t: "select", label: "چه زمانی؟", opts: { hover: "با رفتن ماوس روی آن", click: "با کلیک (روشن/خاموش)", auto: "خودکار رفت‌وبرگشت", manual: "دستی با اسلایدر", always: "همیشه B", never: "همیشه A" } },
  { k: "manual", t: "range", label: "مقدار mix", min: 0, max: 1, step: .01, show: c => c.trigger === "manual" },
  { k: "autoPeriod", t: "range", label: "مدت هر حالت (ثانیه)", min: .5, max: 15, step: .5, show: c => c.trigger === "auto" },
  { k: "stagger", t: "range", label: "موجی بودن", min: 0, max: 4, step: .05 },
  { k: "order", t: "select", label: "ترتیب موج", opts: { center: "از مرکز به بیرون", edge: "از لبه به داخل", random: "تصادفی", sweep: "از چپ به راست", none: "همه با هم" } },
  { k: "boost", t: "check", label: "حالت AI (fx-ai)" },
  { sec: "ماوس و کلیک" },
  { k: "mouse", t: "select", label: "اثر ماوس", opts: { repel: "هل‌دادن", attract: "جذب‌کردن", swirl: "گرداب", off: "خاموش" } },
  { k: "mouseRadius", t: "range", label: "شعاع اثر (px)", min: 0, max: 300, step: 5 },
  { k: "mouseForce", t: "range", label: "قدرت اثر (px)", min: 0, max: 80, step: 1 },
  { k: "clickShock", t: "check", label: "موج ضربه با کلیک" },
  { k: "shockForce", t: "range", label: "قدرت موج", min: 0, max: 100, step: 1, show: c => c.clickShock },
  { sec: "رنگ و نور" },
  { k: "palette", t: "select", label: "پالت رنگ", opts: { tspro: "آبی tsPro (اصلی)", nebula: "سحابی", fire: "آتش", aurora: "شفق", rainbow: "رنگین‌کمان", mono: "سفید" } },
  { k: "colorMode", t: "select", label: "رنگ‌دهی", opts: { cycle: "چرخشی (اصلی)", random: "تصادفی", radius: "بر اساس فاصله", angle: "بر اساس زاویه" } },
  { k: "blend", t: "select", label: "ترکیب نور", opts: { lighter: "lighter (جمع نور، اصلی)", "source-over": "معمولی", screen: "screen", "color-dodge": "color-dodge", difference: "difference" } },
  { k: "glow", t: "check", label: "هاله‌ی مرکزی" },
  { k: "glowStrength", t: "range", label: "شدت هاله", min: 0, max: 3, step: .05, show: c => c.glow },
  { k: "twinkle", t: "range", label: "کندی چشمک (ms)", min: 60, max: 4000, step: 10 },
  { k: "alphaBase", t: "range", label: "شفافیت پایه", min: 0, max: 1, step: .01 },
  { k: "alphaAmp", t: "range", label: "شدت چشمک", min: 0, max: 1, step: .01 },
  { k: "trail", t: "range", label: "دنباله‌ی حرکت", min: 0, max: .97, step: .01 },
  { k: "bg", t: "color", label: "رنگ پس‌زمینه" }
];
const EXTRA = { bg: "#05070f" };   // UI-only keys, not engine options

const PRESETS = {
  "اصلی tsPro": {},
  "آندرومدا": { n: 2200, arms: 2, twist: 6.5, scatter: .55, radiusBias: .8, flatten: .42, tilt: -.6, diffRot: 2, palette: "nebula", colorMode: "radius", trigger: "auto", autoPeriod: 5, sizeMin: .3, sizeRange: 1.2 },
  "سیاه‌چاله": { n: 1600, from: "ring", to: "galaxy", arms: 5, twist: 10, scatter: .4, radiusBias: 1.4, diffRot: 3.5, flatten: .7, speed: .006, mouse: "swirl", mouseRadius: 140, mouseForce: 30, trail: .82, palette: "fire", colorMode: "radius", trigger: "always", glowStrength: .5 },
  "کره": { n: 1400, to: "sphere", tilt: -.35, palette: "aurora", colorMode: "angle", trigger: "auto", autoPeriod: 4, sizeMin: .4, sizeRange: 1.4, stagger: 1.2 },
  "قلب": { n: 900, to: "heart", palette: "nebula", colorMode: "random", trigger: "auto", autoPeriod: 3, order: "edge", stagger: 1.5, sizeMin: .6, clickShock: true },
  "متن": { n: 2600, to: "text", text: "PIXCEL", palette: "tspro", trigger: "auto", autoPeriod: 4, order: "sweep", stagger: 1.4, sizeMin: .5, sizeRange: 1, mouseRadius: 80, mouseForce: 22, clickShock: true },
  "DNA": { n: 900, from: "sphere", to: "helix", palette: "rainbow", colorMode: "cycle", trigger: "auto", autoPeriod: 4, speed: .004, stagger: 1, order: "sweep" },
  "ستاره‌ی دنباله‌دار": { n: 700, from: "star", to: "galaxy", arms: 4, twist: 7, speed: .012, trail: .9, palette: "mono", colorMode: "random", trigger: "click", clickShock: true },
  "شبکه": { n: 900, from: "grid", to: "disc", palette: "aurora", colorMode: "radius", trigger: "auto", order: "random", stagger: 2, blend: "source-over", glow: false },

  "مکعب": { n: 1200, to: "cube", palette: "aurora", colorMode: "angle", trigger: "auto", autoPeriod: 4, stagger: 1.2, sizeMin: .4, sizeRange: 1.2 },
  "هرم": { n: 1100, to: "pyramid", palette: "fire", colorMode: "angle", trigger: "auto", autoPeriod: 3, stagger: 1.1 },
  "توروس": { n: 1600, to: "torus", palette: "nebula", colorMode: "radius", trigger: "auto", autoPeriod: 4, speed: .005, stagger: 1 },
  "مارپیچ": { n: 1500, to: "spiral", palette: "rainbow", colorMode: "cycle", trigger: "always", speed: .006, stagger: .8 },
  "گل کیهانی": { n: 1800, to: "flower", palette: "aurora", colorMode: "angle", trigger: "auto", autoPeriod: 4, stagger: 1.4 },
  "ماندالا": { n: 2200, to: "mandala", palette: "rainbow", colorMode: "angle", trigger: "auto", autoPeriod: 5, order: "edge", stagger: 1.5 },
  "بی‌نهایت": { n: 1000, to: "infinity", palette: "nebula", colorMode: "cycle", trigger: "auto", autoPeriod: 3, stagger: 1 },
  "پروانه": { n: 1400, to: "butterfly", palette: "rainbow", colorMode: "angle", trigger: "auto", autoPeriod: 3, stagger: 1.3, clickShock: true },
  "اتم": { n: 1200, to: "atom", palette: "aurora", colorMode: "cycle", trigger: "always", speed: .008, glowStrength: .5 },
  "هلال ماه": { n: 900, to: "crescent", palette: "mono", colorMode: "radius", trigger: "auto", autoPeriod: 4, stagger: 1 },
  "موج انرژی": { n: 1800, to: "wave", palette: "nebula", colorMode: "cycle", trigger: "always", speed: .009, trail: .86 },
  "ستاره پنج‌پر": { n: 1000, to: "star", palette: "fire", colorMode: "radius", trigger: "auto", autoPeriod: 3, stagger: 1.2 },
  "گل شش‌پر": { n: 1400, to: "flower", petals: 6, palette: "rainbow", colorMode: "angle", trigger: "auto", autoPeriod: 4, stagger: 1.2 },
  "کهکشان مارپیچی": { n: 2400, to: "galaxy", arms: 3, twist: 8, scatter: .35, radiusBias: 1, flatten: .5, palette: "nebula", colorMode: "radius", trigger: "auto", autoPeriod: 5, stagger: 1.3 },
  "حلقه‌های زحل": { n: 1800, from: "sphere", to: "ring", palette: "aurora", colorMode: "radius", trigger: "auto", autoPeriod: 4, tilt: -.5, stagger: 1.2 },
  "موج سینوسی": { n: 1400, to: "wave", palette: "rainbow", colorMode: "cycle", trigger: "always", speed: .006, mouse: "swirl", mouseRadius: 100, mouseForce: 18 },
  "چهره انسان": { n: 3000, to: "image", shape: "human-face-front", palette: "aurora", colorMode: "radius", trigger: "auto", autoPeriod: 5, order: "sweep", stagger: 1.5, sizeMin: .35, sizeRange: .9 },
  "چهره گربه": { n: 1800, to: "image", shape: "cat-face-front", palette: "fire", colorMode: "radius", trigger: "auto", autoPeriod: 4, order: "edge", stagger: 1.2, sizeMin: .4, sizeRange: 1.1, clickShock: true },
  "جمجمه": { n: 2200, to: "image", shape: "skull-front", palette: "mono", colorMode: "radius", trigger: "auto", autoPeriod: 5, order: "sweep", stagger: 1.4 },
  "چشم کیهانی": { n: 1600, to: "image", shape: "eye", palette: "nebula", colorMode: "angle", trigger: "auto", autoPeriod: 4, stagger: 1.2 },
  "صورتک": { n: 1000, to: "image", shape: "smiley", palette: "rainbow", colorMode: "random", trigger: "auto", autoPeriod: 3, stagger: 1 },
  "مثلث": { n: 900, to: "triangle", palette: "fire", trigger: "auto", autoPeriod: 3, stagger: 1 },
  "مربع": { n: 900, to: "square", palette: "aurora", trigger: "auto", autoPeriod: 3, stagger: 1 },
  "شش‌ضلعی": { n: 1200, to: "hexagon", palette: "nebula", trigger: "auto", autoPeriod: 3, stagger: 1.2 }

};

/* ---------------------------------------------------------------- state */
function load() {
  try { if (location.hash.startsWith("#c=")) return JSON.parse(decodeURIComponent(location.hash.slice(3))); } catch (e) {}
  try { const s = localStorage.getItem("pixcel.cfg"); if (s) return JSON.parse(s); } catch (e) {}
  return {};
}
let cfg = Object.assign({}, D, EXTRA, load());
delete cfg.host;
const g = PixcelGalaxy($("cv"), engineOpts(cfg));
const stage = $("stage");
stage.style.setProperty("--stage-bg", cfg.bg);

function engineOpts(c) { const o = Object.assign({}, c); for (const k in EXTRA) delete o[k]; return o; }
function save() { try { localStorage.setItem("pixcel.cfg", JSON.stringify(cfg)); } catch (e) {} }
function changed() {   // only the keys that differ from the original
  const o = {};
  for (const k in cfg) if (k in D && JSON.stringify(cfg[k]) !== JSON.stringify(D[k])) o[k] = cfg[k];
  return o;
}
function apply(patch) {
  Object.assign(cfg, patch);
  g.set(engineOpts(patch));
  if ("bg" in patch) stage.style.setProperty("--stage-bg", cfg.bg);
  save(); sync();
}

/* ---------------------------------------------------------------- controls */
const box = $("controls");
const fmt = (v, s) => s.t !== "range" ? "" : (s.step < .001 ? (+v).toFixed(4) : s.step < .1 ? (+v).toFixed(s.step < .01 ? 3 : 2) : s.step < 1 ? (+v).toFixed(1) : String(Math.round(v)));
const rows = [];
let secEl = null;
for (const s of SCHEMA) {
  if (s.sec) { secEl = document.createElement("h4"); secEl.textContent = s.sec; box.appendChild(secEl); rows.push({ s, el: secEl }); continue; }
  const row = document.createElement("div");
  row.className = "ctl" + (s.t === "range" ? "" : " wide");
  const id = "c_" + s.k;
  let input;
  if (s.t === "select") {
    input = document.createElement("select");
    for (const [v, l] of Object.entries(s.opts)) input.add(new Option(l, v));
  } else {
    input = document.createElement("input");
    input.type = s.t === "check" ? "checkbox" : s.t;
    if (s.t === "range") Object.assign(input, { min: s.min, max: s.max, step: s.step });
    if (s.t === "check") input.style.justifySelf = "start";
  }
  input.id = id;
  row.innerHTML = `<label for="${id}" title="${s.k}">${s.label}</label>`;
  row.appendChild(input);
  const out = document.createElement("output");
  if (s.t === "range") row.appendChild(out);
  box.appendChild(row);
  const read = () => s.t === "check" ? input.checked : s.t === "range" ? (s.deg ? +input.value * Math.PI / 180 : +input.value) : input.value;
  input.addEventListener(s.t === "text" ? "change" : "input", () => { markPreset(null); apply({ [s.k]: read() }); });
  rows.push({ s, el: row, input, out });
}

function sync() {   // config -> inputs, and show/hide context controls
  for (const r of rows) {
    const { s } = r;
    if (s.show) r.el.hidden = !s.show(cfg);
    if (!r.input) continue;
    const v = cfg[s.k];
    if (s.t === "check") r.input.checked = !!v;
    else if (s.t === "range") { const shown = s.deg ? Math.round(v * 180 / Math.PI) : v; if (document.activeElement !== r.input) r.input.value = shown; r.out.textContent = fmt(shown, s); }
    else if (document.activeElement !== r.input) r.input.value = v;
  }
  const hints = { hover: "ماوس را روی صحنه ببرید تا شکل A به B تبدیل شود", click: "روی صحنه کلیک کنید تا بین A و B جابه‌جا شود", auto: "تبدیل خودکار رفت‌وبرگشت می‌کند", manual: "با اسلایدر «مقدار mix» تبدیل را دستی جلو ببرید", always: "همیشه در حالت B", never: "همیشه در حالت A" };
  $("hint").textContent = hints[cfg.trigger] || "";
}

/* ---------------------------------------------------------------- presets */
const pbox = $("presets");
function markPreset(name) { for (const b of pbox.children) b.classList.toggle("on", b.textContent === name); }
for (const name of Object.keys(PRESETS)) {
  const b = document.createElement("button");
  b.className = "btn"; b.textContent = name;
  b.onclick = () => { cfg = Object.assign({}, D, EXTRA, PRESETS[name]); delete cfg.host; g.set(engineOpts(cfg)); stage.style.setProperty("--stage-bg", cfg.bg); save(); sync(); markPreset(name); };
  pbox.appendChild(b);
}

/* ---------------------------------------------------------------- actions */
const toast = msg => { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 1600); };
const copy = (text, msg) => {
  const done = () => toast(msg);
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallback());
  else fallback();
  function fallback() { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { prompt("کپی کنید:", text); } ta.remove(); }
};
$("b_reset").onclick = () => $("presets").children[0].click();
$("b_random").onclick = () => {
  const r = (a, b, step = .01) => Math.round((a + Math.random() * (b - a)) / step) * step;
  const pick = o => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  markPreset(null);
  apply({
    from: pick(SHAPES), to: pick(SHAPES), arms: r(1, 6, 1), twist: r(1, 10, .1), scatter: r(.2, 1.4), radiusBias: r(.4, 1.6),
    diffRot: r(0, 3, .1), flatten: r(.35, 1), tilt: r(-1, 1), n: r(300, 2500, 10), speed: r(.002, .01, .0005),
    stagger: r(0, 2), order: pick({ center: 1, edge: 1, random: 1, sweep: 1 }), palette: pick(PixcelGalaxy.palettes),
    colorMode: pick({ cycle: 1, random: 1, radius: 1, angle: 1 }), mouse: pick({ repel: 1, attract: 1, swirl: 1 }),
    trail: Math.random() < .3 ? r(.6, .92) : 0, trigger: "auto"
  });
};
$("b_scramble").onclick = () => g.scramble();
$("b_shock").onclick = () => g.shock();
$("b_png").onclick = () => {
  const c = $("cv"), t = document.createElement("canvas"); t.width = c.width; t.height = c.height;
  const x = t.getContext("2d"); x.fillStyle = cfg.bg; x.fillRect(0, 0, t.width, t.height); x.drawImage(c, 0, 0);
  const a = document.createElement("a"); a.download = "pixcel-galaxy.png"; a.href = t.toDataURL("image/png"); a.click();
};
$("b_json").onclick = () => copy(JSON.stringify(changed(), null, 2), "تنظیمات (فقط مقادیر تغییرکرده) کپی شد");
$("b_embed").onclick = () => copy(
`<canvas id="galaxy" style="width:300px;height:300px"></canvas>
<script src="galaxy.js"></script>
<script>
  PixcelGalaxy(document.getElementById("galaxy"), ${JSON.stringify(changed(), null, 2).replace(/\n/g, "\n  ")});
</script>`, "کد استفاده کپی شد");
$("b_link").onclick = () => copy(location.href.split("#")[0] + "#c=" + encodeURIComponent(JSON.stringify(changed())), "لینک با تنظیمات فعلی کپی شد");
$("b_size").onclick = () => { stage.classList.toggle("small"); $("b_size").classList.toggle("primary"); };
$("b_full").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen && stage.requestFullscreen(); };

/* ---------------------------------------------------------------- HUD */
setInterval(() => {
  const s = g.state();
  $("hud").innerHTML = `fps ${s.fps.toFixed(0).padStart(3)}   dots ${s.n}\nmix ${s.mix.toFixed(2)} <span class="bar"><i style="width:${(s.mix * 100).toFixed(0)}%"></i></span>\nspd ${s.spd.toFixed(2)}   rot ${s.rot.toFixed(2)} rad`;
}, 120);

sync();
if (!Object.keys(changed()).length) markPreset("اصلی tsPro");
})();
