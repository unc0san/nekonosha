// Whole-office map in an isometric 3/4 view (2:1 pixel lines) on a bright day: the building stands in a lawn park
// with Mt. Fuji beyond it.
// World coordinates: u runs to the lower right, v to the lower left, z up. The building is roofless: the two back walls
// stand full height, the rest are low white partitions or tall glass. Layout comes from office-map.json.
//   map/building.png  sky, Fuji, lawn, trees, benches, floors, back walls, stairs (always behind everything)
//   map/walls.png     low walls and glass; the map shows it in depth-sorted chunks so cats can pass behind them
//   map/<piece>.png   furniture, each with its world anchor recorded in office-map-sprites.json
import { readFileSync } from "node:fs";
import { Pixels, bayer, inEllipse, random, sheet } from "./lib/pixel.mjs";
import { leafShape, onlyEmpty, tone } from "./president-room.mjs";
import { text } from "./room-shell.mjs";
import { logoSign } from "./reception.mjs";
import { whiteboard } from "./meeting-room.mjs";
import { TYPE_FRAMES, typeBeat } from "./staff-cats.mjs";
import { cloud, flowerAt, fuji, horizonBand } from "./daylight.mjs";
import * as P from "./palette.mjs";

const MAP = JSON.parse(readFileSync(new URL("../../app/components/office/office-map.json", import.meta.url), "utf8"));
const { width: W, height: H } = MAP.stage;
const { u: U, v: V, wall: HW, low: LOW, glass: HG, thick: T } = MAP.world;
const R = MAP.rooms, C = MAP.corridor;

const WALL_TOP = ["#cfc6be", "#e6dfd8", "#f6f2ec", "#ffffff"];
const PANE = [178, 214, 226, 120];
const SHADOW = [60, 40, 50, 70];
const WARM = [255, 200, 130];
const D = P.day;

// ---------- Projection kit ----------
const kit = (ax, ay) => ({
  ax, ay,
  at: (u, v, z = 0) => [ax + u - v, ay + (u + v) / 2 - z],
  onZ: (x, y, z) => { const X = x + 0.5 - ax, Y = y + 0.5 - ay; return [(X + 2 * (Y + z)) / 2, (2 * (Y + z) - X) / 2]; },
  onV: (x, y, v) => { const u = x + 0.5 - ax + v; return [u, (u + v) / 2 - (y + 0.5 - ay)]; },
  onU: (x, y, u) => { const v = u - (x + 0.5 - ax); return [v, (u + v) / 2 - (y + 0.5 - ay)]; },
});
const paint = (color, a, b, x, y) => (typeof color === "function" ? color(a, b, x, y) : color);
function top(img, o, z, [u0, u1], [v0, v1], color) {
  img.fill((x, y) => { const [u, v] = o.onZ(x, y, z); return u >= u0 && u < u1 && v >= v0 && v < v1; }, (x, y) => { const [u, v] = o.onZ(x, y, z); return paint(color, u, v, x, y); });
}
function faceV(img, o, v, [u0, u1], [z0, z1], color) {
  img.fill((x, y) => { const [u, z] = o.onV(x, y, v); return u >= u0 && u < u1 && z >= z0 && z < z1; }, (x, y) => { const [u, z] = o.onV(x, y, v); return paint(color, u, z, x, y); });
}
function faceU(img, o, u, [v0, v1], [z0, z1], color) {
  img.fill((x, y) => { const [v, z] = o.onU(x, y, u); return v >= v0 && v < v1 && z >= z0 && z < z1; }, (x, y) => { const [v, z] = o.onU(x, y, u); return paint(color, v, z, x, y); });
}
// Solid block: lit top, half-lit +v side (lower left), shaded +u side (lower right), bright front edges.
function box(img, o, [u0, v0, z0], [u1, v1, z1], { top: ct, left: cl, right: cr, rim = true }) {
  faceV(img, o, v1, [u0, u1], [z0, z1], (u, z, x, y) => (rim && z >= z1 - 1 ? P.shell[4] : paint(cl, u, z, x, y)));
  faceU(img, o, u1, [v0, v1], [z0, z1], (v, z, x, y) => (rim && z >= z1 - 1 ? P.shell[2] : paint(cr, v, z, x, y)));
  top(img, o, z1, [u0, u1], [v0, v1], ct);
}
const ramp = (colors, t, spread = 0.7) => (a, b, x, y) => tone(colors, t, x, y, spread);
const solid = color => () => color;
// A flat picture painted onto a wall plane, one texel per world unit.
function decal(img, o, plane, at, start, zTop, picture) {
  const sample = (s, t) => (s >= 0 && s < picture.width && t >= 0 && t < picture.height ? picture.get(Math.floor(s), Math.floor(t)) : null);
  const coords = (x, y) => { if (plane === "v") { const [u, z] = o.onV(x, y, at); return [u - start, zTop - z]; } const [v, z] = o.onU(x, y, at); return [start - v, zTop - z]; };
  img.fill((x, y) => { const c = sample(...coords(x, y)); return !!c && c[3] > 0; }, (x, y) => sample(...coords(x, y)));
}

// ---------- Furniture ----------
const SPRITES = {};
function piece(name, draw, { shadow = null, outline = true } = {}) {
  const S = 200, o = kit(100, 140);
  const result = draw(o, () => new Pixels(S, S));
  const layers = result instanceof Pixels ? { [name]: result } : result;
  const entries = Object.entries(layers);
  if (outline) for (const [, img] of entries) img.outline(P.OUTLINE);
  if (shadow) onlyEmpty(entries[0][1], (x, y) => { const [u, v] = o.onZ(x, y, 0); return shadow(u, v); }, SHADOW);
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (const [, img] of entries) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (img.get(x, y)[3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (const [key, img] of entries) {
    const out = new Pixels(x1 - x0 + 1, y1 - y0 + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = img.get(x, y); if (c[3]) out.set(x - x0, y - y0, c); }
    SPRITES[key] = { img: out, w: out.width, h: out.height, ax: o.ax - x0, ay: o.ay - y0 };
  }
}
const WHITE = ramp(P.shell, 0.88), WHITE_SIDE = ramp(P.shell, 0.58), WHITE_DARK = ramp(P.shell, 0.32);
const ORANGE = ramp(P.orange, 0.62), ORANGE_DARK = ramp(P.orange, 0.32);
const GREY = ramp(P.metal, 0.7), GREY_DARK = ramp(P.metal, 0.4);
const mug = (img, o, u, v, z, color = P.shell[3]) => box(img, o, [u, v, z], [u + 3, v + 3, z + 4], { top: solid("#5a3a2c"), left: solid(color), right: solid(P.shell[1]), rim: false });

// Work station for a typing cat: desk with keyboard and monitor facing +u, an office chair behind the cat.
// Local origin is the desk's back corner; the cat sits at STATION.cat. The screen is a separate animated strip.
const STATION = MAP.seats.station;
const SCREEN = { v0: 7, v1: 23, z0: 20, z1: 33 };
const SCREEN_CYCLES = 3;
function stationPieces() {
  const [cu, cv] = STATION.cat, d = STATION.depth, w = STATION.width;
  piece("station-desk", (o, make) => {
    const img = make();
    box(img, o, [0, 0, 0], [d, 2, 15], { top: GREY, left: GREY, right: GREY_DARK, rim: false });
    box(img, o, [0, w - 2, 0], [d, w, 15], { top: GREY, left: GREY, right: GREY_DARK, rim: false });
    box(img, o, [1, 2, 6], [2, w - 2, 15], { top: ORANGE, left: ORANGE, right: ORANGE_DARK, rim: false });
    box(img, o, [-1, -1, 15], [d + 1, w + 1, 17], { top: (u, v, x, y) => tone(P.shell, 0.95 - v / 300, x, y, 0.5), left: solid(P.orange[1]), right: solid(P.orange[2]), rim: false });
    // Monitor on a stand, screen toward the cat (+u). The screen picture itself is the station-screen strip.
    box(img, o, [3, 13, 17], [6, 17, 20], { top: GREY, left: GREY, right: GREY_DARK, rim: false });
    box(img, o, [3, 11, 17], [8, 19, 17.6], { top: solid(P.metal[2]), left: solid(P.metal[1]), right: solid(P.metal[1]), rim: false });
    box(img, o, [1, SCREEN.v0 - 1, SCREEN.z0 - 1], [3, SCREEN.v1 + 1, SCREEN.z1 + 1], { top: solid(P.metal[2]), left: solid("#2a2530"), right: solid("#3a3540"), rim: false });
    // Keyboard with key rows, a mug and a sticky note.
    box(img, o, [11.5, 9, 17], [15.5, 21, 18], { top: (u, v) => ((Math.floor(u) + Math.floor(v)) % 2 ? P.metal[3] : P.shell[4]), left: solid(P.metal[2]), right: solid(P.metal[1]), rim: false });
    mug(img, o, 5, 24, 17, P.orange[2]);
    top(img, o, 17.5, [8, 12], [2, 6], "#ffe28a");
    return img;
  }, { shadow: (u, v) => u > -2 && u < d + 3 && v > -2 && v < w + 3 });
  piece("station-chair", (o, make) => {
    const seat = make(), back = make();
    const [x, y] = o.at(cu, cv);
    for (const a of [0.3, 1.55, 2.8, 4.05, 5.3]) { const ex = x + Math.cos(a) * 9, ey = y + Math.sin(a) * 4.5; seat.line(x, y - 1, Math.round(ex), Math.round(ey - 1), P.metal[1]); seat.ball(ex, ey, 1.6, 1.4, P.metal); }
    seat.rect(x - 1, y - 9, 3, 8, P.metal[2]);
    box(seat, o, [cu - 7, cv - 7, 8], [cu + 7, cv + 7, 11], { top: ramp(P.orange, 0.8), left: ORANGE, right: ORANGE_DARK, rim: false });
    // Low backrest behind the cat, on the viewer's side.
    box(back, o, [cu + 8, cv - 6, 11], [cu + 10, cv + 6, 24], { top: solid(P.shell[4]), left: (u, z, px, py) => (z > 22.5 ? P.shell[4] : tone(P.orange, 0.62, px, py)), right: (v, z, px, py) => (z > 22.5 ? P.shell[3] : tone(P.orange, 0.4, px, py)), rim: false });
    box(back, o, [cu + 7, cv - 1, 9], [cu + 9, cv + 1, 12], { top: GREY, left: GREY, right: GREY_DARK, rim: false });
    return { "station-chair": seat, "station-back": back };
  }, { shadow: (u, v) => (u - cu) ** 2 + (v - cv) ** 2 < 90 });
  // Screen strips: SCREEN_CYCLES typing cycles, so finished lines scroll up between cycles. "idle" is the screensaver.
  const strip = draw => Array.from({ length: TYPE_FRAMES * SCREEN_CYCLES }, (_, f) => draw(f));
  const pictures = { code: strip(codeScreen), chart: strip(chartScreen), doc: strip(docScreen), idle: [idleScreen()] };
  for (const [kind, frames] of Object.entries(pictures)) {
    const name = `station-screen-${kind}`;
    piece(name, (o, make) => Object.fromEntries(frames.map((picture, f) => {
      const img = make();
      faceU(img, o, 3, [SCREEN.v0, SCREEN.v1], [SCREEN.z0, SCREEN.z1], (v, z) => picture.get(Math.floor(SCREEN.v1 - v), Math.floor(SCREEN.z1 - z)));
      return [`${name}#${f}`, img];
    })), { outline: false });
    const parts = frames.map((_, f) => SPRITES[`${name}#${f}`]);
    frames.forEach((_, f) => delete SPRITES[`${name}#${f}`]);
    SPRITES[name] = { ...parts[0], img: sheet(parts.map(p => p.img)), frames: frames.length };
  }
}

const SCREEN_W = SCREEN.v1 - SCREEN.v0, SCREEN_H = SCREEN.z1 - SCREEN.z0;
const CODE_COLORS = [P.orange[3], "#8fd0ff", "#f4efe6", "#9be08a", "#f4efe6", "#ffd27a"];
const lineLength = i => 5 + ((i * 7 + 3) % 9);
function screenBase() {
  const img = new Pixels(SCREEN_W, SCREEN_H);
  img.fill(() => true, "#1d2640");
  img.rect(0, 0, SCREEN_W, 2, P.orange[2]);
  img.set(SCREEN_W - 2, 0, "#fff1df");
  return img;
}
// Code editor: four finished lines and the one being typed. Each keystroke adds a character; the cursor blinks
// while the cat reads; between cycles the lines scroll up.
function codeScreen(f) {
  const img = screenBase(), t = f % TYPE_FRAMES, cycle = Math.floor(f / TYPE_FRAMES), beat = typeBeat(t);
  const typed = Math.min(t, 32) >> 1;
  for (let row = 0; row < 5; row++) {
    const i = cycle + row, y = 3 + row * 2, indent = (i % 3) * 2;
    const length = row < 4 ? lineLength(i) : Math.min(lineLength(i), typed);
    img.rect(1, y, 1, 1, "#56607a");
    for (let x = 0; x < length && 3 + indent + x < SCREEN_W - 1; x++) if ((x + i) % 5 !== 4) img.set(3 + indent + x, y, CODE_COLORS[(i + Math.floor(x / 4)) % CODE_COLORS.length]);
    if (row === 4 && (beat.typing || t % 4 < 2)) img.rect(3 + indent + length, y - 1, 1, 2, "#ffffff");
  }
  return img;
}
// Chart: four settled bars and one that grows with each keystroke, then a trend line drawn in while the cat reads.
function chartScreen(f) {
  const img = screenBase(), t = f % TYPE_FRAMES, cycle = Math.floor(f / TYPE_FRAMES), beat = typeBeat(t);
  const heights = [4, 6, 5, 7, 8, 6, 9];
  img.rect(1, SCREEN_H - 2, SCREEN_W - 2, 1, "#56607a");
  for (let i = 0; i < 5; i++) {
    const full = heights[(cycle + i) % heights.length], h = i < 4 ? full : Math.round(full * Math.min(1, t / 30));
    img.rect(2 + i * 3, SCREEN_H - 2 - h, 2, h, i === 4 ? P.orange[3] : "#8fd0ff");
  }
  if (!beat.typing) for (let x = 2; x < 2 + Math.min(14, (t - 32) * 2); x++) img.set(x, 4 + Math.round(Math.sin((x + cycle * 3) / 2.5) * 1.5), "#ffd27a");
  return img;
}
// Document: a white page with a heading; each keystroke adds to the last line, and lines scroll between cycles.
function docScreen(f) {
  const img = screenBase(), t = f % TYPE_FRAMES, cycle = Math.floor(f / TYPE_FRAMES), beat = typeBeat(t);
  img.rect(1, 3, SCREEN_W - 2, SCREEN_H - 4, "#fbf9f4");
  img.rect(3, 4, 6, 1, P.orange[2]);
  const typed = Math.min(t, 32) >> 1;
  for (let row = 0; row < 4; row++) {
    const i = cycle + row, y = 6 + row * 2, length = row < 3 ? lineLength(i) : Math.min(lineLength(i), typed);
    img.rect(3, y, Math.min(length, SCREEN_W - 5), 1, "#9a93a0");
    if (row === 3 && (beat.typing || t % 4 < 2)) img.rect(3 + Math.min(length, SCREEN_W - 5), y - 1, 1, 2, P.orange[1]);
  }
  return img;
}
function idleScreen() {
  const img = new Pixels(SCREEN_W, SCREEN_H);
  img.fill(() => true, "#151a2c");
  const cx = SCREEN_W / 2, cy = SCREEN_H / 2 + 1;
  img.ellipse(cx, cy + 1, 2.6, 2, P.orange[1]);
  for (const [dx, dy] of [[-3, -1.5], [-1.2, -3.4], [1.2, -3.4], [3, -1.5]]) img.ellipse(cx + dx, cy + dy, 1, 1, P.orange[1]);
  return img;
}

function tulip(img, o, r, z, items) {
  const [cx, cy] = o.at(0, 0);
  img.ball(cx, cy - 1, r * 0.75, r * 0.35, P.shell);
  img.shade((x, y) => y >= cy - z && y < cy && Math.abs(x + 0.5 - cx) < 2 + ((y - (cy - z)) / z) ** 2 * (r * 0.4), x => [(x + 0.5 - cx) / 6, 0, 0.9], P.shell);
  const inside = (u, v) => u * u + v * v < r * r;
  img.fill((x, y) => { const [u, v] = o.onZ(x, y, z); if (inside(u, v)) return false; const [a, b] = o.onZ(x, y, z - 2.5); return inside(a, b); }, (x, y) => tone(P.orange, 0.45, x, y));
  top(img, o, z, [-r, r], [-r, r], (u, v, x, y) => (!inside(u, v) ? null : u * u + v * v > (r - 2.5) ** 2 ? P.orange[3] : tone(P.shell, 0.95 - (u + v) / 200, x, y, 0.5)));
  items?.();
}

function roundTable() {
  piece("round-table", (o, make) => {
    const img = make();
    tulip(img, o, 15, 13, () => {
      mug(img, o, -8, -4, 13); mug(img, o, 6, -2, 13, P.orange[2]);
      const [px, py] = o.at(0, 4, 13);
      img.ball(px, py - 2, 3, 2.5, P.orange); leafShape(img, px, py - 4, -2.1, 7, 2, random(1)); leafShape(img, px, py - 4, -1.0, 7, 2, random(2)); leafShape(img, px, py - 4, -1.6, 8, 2, random(3));
    });
    return img;
  }, { shadow: (u, v) => u * u + v * v < 300 });
}

function meetingTable() {
  piece("meeting-table", (o, make) => {
    const img = make(), ru = 40, rv = 24, z = 14;
    const inside = (u, v) => (u / ru) ** 2 + (v / rv) ** 2 < 1;
    for (const pu of [-18, 18]) { const [px, py] = o.at(pu, 0); img.ball(px, py - 1, 9, 3.5, P.shell); img.shade((x, y) => y >= py - z && y < py && Math.abs(x + 0.5 - px) < 2 + ((y - (py - z)) / z) ** 2 * 5, x => [(x + 0.5 - px) / 6, 0, 0.9], P.shell); }
    img.fill((x, y) => { const [u, v] = o.onZ(x, y, z); if (inside(u, v)) return false; const [a, b] = o.onZ(x, y, z - 3); return inside(a, b); }, (x, y) => tone(P.orange, 0.4, x, y));
    top(img, o, z, [-ru, ru], [-rv, rv], (u, v, x, y) => (!inside(u, v) ? null : (u / ru) ** 2 + (v / rv) ** 2 > 0.8 ? P.orange[3] : tone(P.shell, 0.95 - (u + v) / 400, x, y, 0.5)));
    top(img, o, z + 0.5, [-24, -14], [-6, 2], P.shell[4]); top(img, o, z + 0.5, [14, 24], [0, 8], P.shell[4]);
    mug(img, o, -6, -12, z); mug(img, o, 20, -10, z, P.orange[2]); mug(img, o, -20, 8, z);
    const [px, py] = o.at(0, 0, z);
    img.ball(px, py - 3, 4, 3, P.orange); leafShape(img, px, py - 5, -2.2, 9, 2.4, random(1)); leafShape(img, px, py - 5, -1.0, 9, 2.4, random(2)); leafShape(img, px, py - 5, -1.6, 11, 2.4, random(3));
    return img;
  }, { shadow: (u, v) => (u / 44) ** 2 + (v / 28) ** 2 < 1 });
}

function bookshelf() {
  piece("bookshelf", (o, make) => {
    const img = make(), dv = 40, h = 46, rand = random(31);
    box(img, o, [0, 0, 0], [12, dv, h], { top: WHITE, left: WHITE_SIDE, right: WHITE_DARK });
    const spines = Array.from({ length: 4 }, () => { const list = []; for (let v = 3; v < dv - 3;) { const w = 2 + Math.floor(rand() * 3); list.push([v, w, P.books[Math.floor(rand() * P.books.length)], 6 + Math.floor(rand() * 3)]); v += w; } return list; });
    faceU(img, o, 12, [2, dv - 2], [2, h - 2], (v, z, x, y) => {
      const shelf = Math.floor((z - 2) / 10.5), level = (z - 2) % 10.5;
      if (level < 1.5) return P.shell[3];
      const book = spines[shelf]?.find(([v0, w]) => v >= v0 && v < v0 + w);
      if (book && level < book[3]) return tone([book[2], book[2]], 0.5, x, y);
      return level > 8.5 ? "#2f2630" : "#3d3139";
    });
    // A mug and a little cat figure on top.
    mug(img, o, 4, 8, h); const [fx, fy] = o.at(6, 26, h); img.ball(fx, fy - 3, 3, 3, P.orange); img.set(fx - 2, fy - 6, P.orange[3]); img.set(fx + 2, fy - 6, P.orange[3]);
    return img;
  }, { shadow: (u, v) => u > -1 && u < 16 && v > 0 && v < 44 });
}

function cabinet() {
  piece("cabinet", (o, make) => {
    const img = make(), w = 24, d = 12, h = 34;
    box(img, o, [0, 0, 0], [w, d, h], {
      top: WHITE, right: WHITE_DARK,
      left: (u, z, x, y) => { const drawer = Math.floor(z / 11); if (z % 11 < 1 || u < 1 || u > w - 1) return P.shell[2]; if (Math.abs(u - w / 2) < 3 && z % 11 > 7 && z % 11 < 8.5) return P.shell[4]; return drawer === 1 ? tone(P.shell, 0.7, x, y) : tone(P.orange, 0.6, x, y); },
    });
    const [px, py] = o.at(16, 6, h); img.ball(px, py - 2, 3, 2.5, P.shell); leafShape(img, px, py - 4, -2.0, 8, 2.2, random(8)); leafShape(img, px, py - 4, -1.1, 8, 2.2, random(9));
    box(img, o, [3, 3, h], [11, 9, h + 3], { top: solid(P.shell[4]), left: solid(P.metal[3]), right: solid(P.metal[2]), rim: false });
    return img;
  }, { shadow: (u, v) => u > -1 && u < 28 && v > -1 && v < 16 });
}

function counter() {
  piece("counter", (o, make) => {
    const img = make(), w = 60, d = 16, h = 22;
    box(img, o, [0, 0, 0], [w, d, h - 3], {
      top: WHITE, right: ramp(P.shell, 0.45),
      left: (u, z, x, y) => {
        const dx = u - w / 2, dz = z - 9;
        if (dx * dx + dz * dz < 40) return dx * dx / 7 + (dz - 1.2) ** 2 / 5 < 1 || [[-3.5, 1], [-1.3, 3.8], [1.3, 3.8], [3.5, 1]].some(([a, b]) => (dx - a) ** 2 + (dz + b) ** 2 < 1.3) ? P.shell[4] : P.orange[2];
        if (z > 14 && z < 16.5) return P.orange[2];
        return z < 2 ? P.metal[2] : tone(P.shell, 0.8 - z / 120, x, y, 0.6);
      },
    });
    box(img, o, [-2, -2, h - 3], [w + 2, d + 2, h], { top: (u, v, x, y) => tone(P.shell, 0.96 - u / 400, x, y, 0.5), left: solid(P.shell[3]), right: solid(P.shell[2]), rim: false });
    // Bell, a globe lamp and a little plant.
    const [bx, by] = o.at(40, 6, h); img.ball(bx, by - 2, 3, 2.5, ["#b48a2e", "#e0b64a", "#ffe08a"]); img.rect(bx, by - 6, 1, 2, "#b48a2e");
    const [kx, ky] = o.at(8, 6, h); img.rect(kx - 1, ky - 8, 2, 8, P.metal[2]); img.ball(kx, ky - 10, 5, 4, P.shell, { bias: 0.1 });
    const [px, py] = o.at(52, 6, h); img.ball(px, py - 2, 3, 2.5, P.orange); leafShape(img, px, py - 4, -2.0, 7, 2, random(5)); leafShape(img, px, py - 4, -1.1, 7, 2, random(6));
    mug(img, o, 24, 4, h);
    return img;
  }, { shadow: (u, v) => u > -3 && u < 64 && v > -3 && v < 21 });
}

function coffeeBar() {
  piece("coffee-bar", (o, make) => {
    const img = make(), w = 52, d = 16, h = 22;
    box(img, o, [0, 0, 0], [w, d, h], { top: WHITE, left: (u, z, x, y) => (z < 2 ? "#2f2630" : z > 16 && z < 18 ? P.shell[4] : Math.floor(u / 13) % 2 ? tone(P.orange, 0.62, x, y) : tone(P.orange, 0.42, x, y)), right: ORANGE_DARK });
    // Espresso machine with a lit window, cups and a jar of treats.
    box(img, o, [6, 2, h], [22, 12, h + 15], { top: GREY, left: (u, z) => (z > h + 10 && z < h + 12 ? P.orange[2] : z < h + 5 && u > 11 && u < 17 ? "#2f2630" : P.metal[3]), right: GREY_DARK });
    box(img, o, [12, 11, h], [16, 13, h + 3], { top: solid(P.shell[4]), left: solid(P.shell[3]), right: solid(P.shell[2]), rim: false });
    for (const u of [28, 33, 38]) mug(img, o, u, 7, h, u === 33 ? P.orange[2] : P.shell[3]);
    box(img, o, [43, 4, h], [49, 10, h + 8], { top: solid(P.orange[2]), left: solid([196, 226, 236, 255]), right: solid([170, 205, 220, 255]), rim: false });
    return img;
  }, { shadow: (u, v) => u > -2 && u < 56 && v > -1 && v < 20 });
}

function sofa() {
  const { du } = MAP.seats.sofa;
  piece("sofa", (o, make) => {
    const back = make(), front = make();
    const seam = u => [du / 3, (2 * du) / 3].some(s => Math.abs(u - s) < 0.7);
    box(back, o, [0, 0, 0], [du, 24, 3], { top: solid(P.metal[1]), left: solid(P.metal[1]), right: solid(P.metal[0]), rim: false });
    box(back, o, [0, 0, 3], [du, 7, 28], { top: ramp(P.orange, 0.85), left: (u, z, x, y) => (seam(u) ? P.orange[1] : tone(P.orange, 0.66 - (28 - z) / 100, x, y)), right: ORANGE_DARK });
    box(back, o, [0, 7, 3], [du, 24, 12], { top: (u, v, x, y) => (seam(u) ? P.orange[1] : tone(P.orange, 0.8, x, y)), left: ramp(P.orange, 0.5), right: ORANGE_DARK, rim: false });
    // Seat front and both arms sit in front of the cats.
    faceV(front, o, 24, [0, du], [3, 12], (u, z, x, y) => (z >= 11 ? P.orange[4] : tone(P.orange, 0.5, x, y)));
    for (const u0 of [-7, du]) box(front, o, [u0, 0, 3], [u0 + 7, 24, 19], { top: ramp(P.orange, 0.85), left: ramp(P.orange, 0.55), right: ORANGE_DARK });
    return { "sofa-back": back, "sofa-front": front };
  }, { shadow: (u, v) => u > -9 && u < du + 9 && v > -1 && v < 28 });
}

function plant(name, seed, height) {
  piece(name, (o, make) => {
    const img = make(), [cx, cy] = o.at(0, 0), rand = random(seed), topY = cy - 13;
    const leaves = Array.from({ length: 9 }, (_, i) => ({ angle: -Math.PI / 2 + (i - 4) * 0.36 + (rand() - 0.5) * 0.2, length: 12 + rand() * height, width: 3.4 + rand() * 1.4 }));
    leaves.sort((a, b) => Math.abs(b.angle + Math.PI / 2) - Math.abs(a.angle + Math.PI / 2));
    for (const l of leaves) leafShape(img, cx, topY, l.angle, l.length, l.width, rand);
    img.shade((x, y) => y >= topY && y < cy && Math.abs(x + 0.5 - cx) < 7.5 - (y - topY) * 0.15, x => [(x + 0.5 - cx) / 8, -0.2, 0.8], P.shell);
    img.fill((x, y) => y >= topY + 5 && y < topY + 7 && Math.abs(x + 0.5 - cx) < 7.5, P.orange[2]);
    img.ellipse(cx, topY, 7.5, 2.5, P.shell[4]); img.ellipse(cx, topY, 5.5, 1.5, "#5a3a2c");
    return img;
  }, { shadow: (u, v) => u * u + v * v < 100 });
}

function lamp() {
  piece("lamp", (o, make) => {
    const img = make(), [cx, cy] = o.at(0, 0);
    img.ball(cx, cy - 1, 7, 3, P.metal);
    img.rect(cx - 1, cy - 48, 2, 47, P.metal[2]);
    // Warm glowing dome.
    img.ball(cx, cy - 54, 10, 8, ["#f2c98c", "#ffdca8", "#fff0d2", "#fffaf0"], { bias: 0.2 });
    img.fill((x, y) => inEllipse(cx, cy - 54, 10, 8)(x, y) && y > cy - 52, "#ffe6b8");
    img.rect(cx - 10, cy - 52, 20, 1, P.orange[2]);
    return img;
  }, { shadow: (u, v) => u * u + v * v < 50 });
}

// ---------- Building ----------
const O = kit(MAP.origin.x, MAP.origin.y);
const inBox = (r, u, v) => u >= r.u && u < r.u + r.du && v >= r.v && v < r.v + r.dv;
const roomAt = (u, v) => Object.entries(R).find(([, r]) => inBox(r, u, v))?.[0] ?? (inBox(C, u, v) ? "corridor" : null);
const floorZ = (u, v) => (roomAt(u, v) === "suite" ? R.suite.z : 0);
const LAMPS = MAP.props.filter(p => p.kind === "lamp");

function floorColor(room, u, v, x, y) {
  const seam = size => u % size < 1 || v % size < 1;
  const near = Math.min(u, v), ao = near < 8 ? (8 - near) / 26 : 0;
  const ellipse = (cu, cv, ru, rv) => ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2;
  const rug = (d, colors) => (Math.abs(d - 0.7) < 0.05 || Math.abs(d - 0.34) < 0.06 ? colors[3] : tone(colors, (d > 0.86 ? 0.25 : 0.6) - ao, x, y, 1.3));
  let c;
  if (room === "suite") { const d = ellipse(66, 62, 52, 40); c = d < 1 ? rug(d, P.rugOrange) : seam(16) ? P.floor[1] : tone(P.floor, 0.78 - ao, x, y, 0.6); }
  else if (room === "meeting") { const d = ellipse(206, 62, 66, 46); c = d < 1 ? (Math.abs(d - 0.85) < 0.06 ? P.rugGray[0] : tone(P.rugGray, 0.78 - ao, x, y, 0.8)) : (u - v) % 6 < 1 ? P.rugGray[1] : tone(P.rugGray, 0.55 - ao, x, y, 0.6); }
  else if (room === "studio") c = seam(16) ? P.floor[1] : tone(P.floor, 0.8 - ao, x, y, 0.6);
  else if (room === "reception") {
    const paw = ellipse(96, 288, 7, 5) < 1 || [[-6, -6], [-2, -9], [2, -9], [6, -6]].some(([a, b]) => ellipse(96 + a, 288 + b, 2.2, 2.4) < 1);
    const check = (Math.floor(u / 16) + Math.floor(v / 16)) % 2;
    c = paw ? tone(P.orange, 0.75, x, y, 0.6) : seam(16) ? P.floor[1] : tone(P.floor, (check ? 0.9 : 0.6) - ao, x, y, 0.5);
  } else if (room === "lounge") {
    const d = ellipse(214, 256, 62, 40);
    if (d < 1) c = rug(d, P.rugOrange);
    else { const plank = Math.floor(v / 8), joint = (u + plank * 29) % 48 < 1; c = v % 8 < 1 || joint ? "#d9cbb8" : tone(["#e3d7c6", "#ece3d5", "#f5eee3"], 0.55 - ao - (plank % 3) * 0.08, x, y, 0.8); }
  } else if (room === "corridor") {
    const lane = Math.abs(v - C.lane);
    c = lane < 3.5 ? (lane > 2.5 ? P.orange[1] : u % 18 < 6 ? P.orange[4] : P.orange[2]) : seam(16) ? P.metal[3] : tone(["#cfcac4", "#dad5cf", "#e4e0db"], 0.62 - ao, x, y, 0.6);
  }
  if (!c) return null;
  // Faint warm pools under the floor lamps (it is daytime, so they barely show).
  const glow = LAMPS.reduce((sum, l) => sum + Math.max(0, 1 - Math.hypot(u - l.u, v - l.v) / 46), 0);
  if (glow > 0) { const [r, g, b] = typeof c === "string" ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c; const k = Math.min(0.14, glow * 0.14) * (bayer(x, y) * 0.3 + 0.85); c = [r + (WARM[0] - r) * k, g + (WARM[1] - g) * k * 0.9, b + (WARM[2] - b) * k * 0.6, 255].map(Math.round); }
  return c;
}

function tree(img, x, y, seed, size = 1) {
  const rand = random(seed);
  img.fill((px, py) => inEllipse(x, y, 16 * size, 5 * size)(px, py), [40, 90, 30, 80]);
  const trunk = Math.round(26 * size), half = Math.max(1, Math.round(3 * size));
  img.rect(x - half, y - trunk, half * 2, trunk, D.bark[0]); img.rect(x - half, y - trunk, Math.max(1, half - 1), trunk, D.bark[1]);
  const blobs = Array.from({ length: 9 }, () => [x + (rand() - 0.5) * 44 * size, y - (40 + rand() * 30) * size, (11 + rand() * 9) * size]);
  blobs.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, r] of blobs) img.ball(bx, by, r, r * 0.85, D.leaf, { bias: 0.02 });
  for (let i = 0; i < 20 * size; i++) { const [bx, by, r] = blobs[Math.floor(rand() * blobs.length)]; img.set(Math.round(bx + (rand() - 0.5) * r), Math.round(by - rand() * r * 0.6), D.leaf[4]); }
}

// Sky and the far lawn meet the stage edges in flat horizontal bands, so the page can carry them on past the stage
// (office-map-sprites.json lists them as `backdrop`). Everything with detail keeps clear of the edges.
const HORIZON = 66, EDGE = 28;
const SKY_BANDS = [12, 24, 34, 44, 54, HORIZON - 2];
const skyColor = y => D.sky[SKY_BANDS.findIndex(b => y < b)] ?? D.sky.at(-1);
const LAWN = { far: D.grass[3], near: D.grass[2], split: HORIZON + 12 };
export const BACKDROP = [
  ...SKY_BANDS.map((b, i) => [D.sky[i], i ? SKY_BANDS[i - 1] : 0, b]),
  [D.hills[1], HORIZON - 2, HORIZON - 1], [D.trees[2], HORIZON - 1, HORIZON],
  [LAWN.far, HORIZON, LAWN.split], [LAWN.near, LAWN.split, H],
];
// Panorama position and how much detail the horizon may have at screen x (none at the stage edges).
const flatAt = x => Math.max(0, Math.min(1, (Math.min(x, W - 1 - x) - 4) / EDGE));

function bench(img, u, v, along) {
  // Wooden park bench; `along` "u" faces +v (toward the viewer's left), "v" faces +u.
  const [du, dv] = along === "u" ? [18, 6] : [6, 18];
  const wood = (a, b, x, y) => tone(D.wood, 0.7, x, y, 0.6);
  for (const [lu, lv] of along === "u" ? [[1, 1], [16, 1], [1, 5], [16, 5]] : [[1, 1], [1, 16], [5, 1], [5, 16]]) box(img, O, [u + lu, v + lv, 0], [u + lu + 1, v + lv + 1, 5], { top: solid(D.iron), left: solid(D.iron), right: solid(D.iron), rim: false });
  box(img, O, [u, v, 5], [u + du, v + dv, 6.5], { top: wood, left: solid(D.wood[1]), right: solid(D.wood[0]), rim: false });
  const back = along === "u" ? [[u, v, 6.5], [u + du, v + 1.5, 13]] : [[u, v, 6.5], [u + 1.5, v + dv, 13]];
  box(img, O, ...back, { top: solid(D.wood[2]), left: (a, z) => (Math.floor(z) % 3 === 0 ? D.wood[0] : D.wood[1]), right: (a, z) => (Math.floor(z) % 3 === 0 ? D.wood[0] : D.wood[1]), rim: false });
}

function skyAndPark(img) {
  // Sky in flat bands, clouds, Mt. Fuji rising behind the building, then the hills and the tree line on the horizon.
  img.fill((x, y) => y < HORIZON, (x, y) => skyColor(y));
  const everywhere = () => true;
  for (const [cx, cy, w, h] of [[110, 22, 44, 13], [232, 46, 26, 8], [636, 26, 40, 12], [548, 50, 22, 7], [700, 50, 18, 6]]) cloud(img, everywhere, cx, cy, w, h);
  fuji(img, everywhere, { x: 470, base: HORIZON - 1, height: 48, half: 112 });
  horizonBand(img, everywhere, HORIZON, x => x * 1.4, { flat: flatAt });
  // The lawn: lighter toward the horizon, with tufts and clusters of small flowers away from the stage edges.
  img.fill((x, y) => y >= HORIZON, (x, y) => (y < LAWN.split ? LAWN.far : LAWN.near));
  const rand = random(91), free = x => x > EDGE && x < W - EDGE;
  for (let y = HORIZON + 2; y < H; y++) for (let x = 0; x < W; x++) {
    if (!free(x)) continue;
    const r = rand();
    if (r < 0.05) img.set(x, y, D.grass[1]);
    else if (r < 0.075) img.set(x, y, D.grass[4]);
  }
  for (let i = 0; i < 70; i++) {
    const cx = EDGE + 10 + rand() * (W - 2 * EDGE - 20), cy = HORIZON + 16 + rand() * (H - HORIZON - 22);
    for (let k = 0; k < 6; k++) flowerAt(img, Math.round(cx + (rand() - 0.5) * 14), Math.round(cy + (rand() - 0.5) * 6), rand);
  }
  // A soft shadow where the building meets the lawn, a stone landing at the entrance and two stepping stones.
  img.fill((x, y) => { const [u, v] = O.onZ(x, y, 0); return u >= -2 && v >= -2 && u < U + 4 && v < V + 4 && (u >= U || v >= V); }, [40, 80, 30, 60]);
  const door = MAP.walls.find(w => w.axis === "v" && w.at === V).doors[0];
  const paving = (u, v, x, y) => (u % 8 < 0.8 || v % 8 < 0.8 ? D.path[0] : tone(D.path, 0.75, x, y, 0.5));
  top(img, O, 0, [door[0] - 6, door[1] + 6], [V, V + 26], paving);
  for (const [u0, v0] of [[44, 30], [50, 38]]) top(img, O, 0, [u0, u0 + 8], [V + v0, V + v0 + 5], (u, v, x, y) => tone(D.path, 0.6, x, y, 0.5));
}

function parkFurniture(img) {
  for (const b of MAP.benches) bench(img, b.u, b.v, b.along);
}

function floors(img) {
  for (const z of [0, R.suite.z]) img.fill((x, y) => { const [u, v] = O.onZ(x, y, z); const room = roomAt(u, v); return !!room && floorZ(u, v) === z; }, (x, y) => { const [u, v] = O.onZ(x, y, z); return floorColor(roomAt(u, v), u, v, x, y); });
  // Front edges of the raised president's suite.
  const edge = (a, z) => (z > R.suite.z - 1 ? P.floor[3] : P.floor[0]);
  faceV(img, O, R.suite.v + R.suite.dv, [0, R.suite.du], [0, R.suite.z], edge);
  faceU(img, O, R.suite.u + R.suite.du, [0, R.suite.dv], [0, R.suite.z], edge);
  // Welcome mat outside the entrance.
  const e = MAP.walls.find(w => w.axis === "v" && w.at === V).doors[0];
  const mat = new Pixels(40, 14);
  mat.fill(() => true, (x, y) => (x < 1 || y < 1 || x > 38 || y > 12 ? P.orange[1] : P.orange[2]));
  text(mat, "WELCOME", 0, 5, "#fff1df", { gap: 0 });
  img.fill((x, y) => { const [u, v] = O.onZ(x, y, 0); return u >= e[0] + 1 && u < e[0] + 41 && v >= V + 6 && v < V + 20; }, (x, y) => { const [u, v] = O.onZ(x, y, 0); return mat.get(Math.floor(u - e[0] - 1), Math.floor(v - V - 6)); });
}

// Daylight through the back windows: sky fading toward the horizon, a band of trees and the lawn, and a glint.
function dayGlass(z0, z1) {
  const horizon = z0 + 7;
  return (s, z, x, y) => {
    if (z < horizon - 3) return z < horizon - 3.5 - (s % 7 < 3 ? 1 : 0) ? tone(D.grass, 0.55, x, y, 0.6) : D.trees[1];
    if (z < horizon) return Math.sin(s * 0.9) > 0.2 ? D.trees[2] : D.hills[0];
    if ((s * 0.5 + z) % 26 < 2.5) return [236, 246, 252, 255];
    return tone(D.sky, (z1 - z) / (z1 - horizon), x, y, 0.8);
  };
}

function backWalls(img) {
  const base = (s, z, x, y, shade) => {
    if (z < 3) return P.metal[1];
    if (z >= 10 && z < 12) return z < 11 ? P.orange[1] : P.orange[3];
    return s % 32 < 0.6 && z > 12 ? P.wall[1] : tone(P.wall, shade - z / 500, x, y);
  };
  const windowOn = (s0, s1) => {
    const sky = dayGlass(18, 54);
    return (s, z, x, y) => {
      if (s < s0 - 2 || s >= s1 + 2 || z < 16 || z >= 56) return null;
      if (s < s0 || s >= s1 || z < 18 || z >= 54) return z < 18 ? P.shell[4] : P.shell[2];
      if ((s - s0) % 20 < 1.2) return P.shell[3];
      return sky(s, z, x, y);
    };
  };
  const vDecor = [windowOn(18, 116), windowOn(294, 380)];
  const uDecor = [windowOn(126, 164), windowOn(22, 50)];
  faceV(img, O, 0, [0, U], [0, HW], (u, z, x, y) => {
    if (z < floorZ(u, 1)) return null;
    for (const w of vDecor) { const c = w(u, z, x, y); if (c) return c; }
    return base(u, z, x, y, 0.9);
  });
  faceU(img, O, 0, [0, V], [0, HW], (v, z, x, y) => {
    if (z < floorZ(1, v)) return null;
    for (const w of uDecor) { const c = w(v, z, x, y); if (c) return c; }
    return base(v, z, x, y, 0.78);
  });
  // Meeting room: whiteboard and a wall screen with a bar chart. Reception: the company sign.
  decal(img, O, "v", 0, 140, 50, whiteboard());
  faceV(img, O, 0, [232, 276], [16, 48], (u, z) => {
    if (u < 234 || u >= 274 || z < 18 || z >= 46) return "#22212a";
    if (z > 41) return P.orange[2];
    const bar = Math.floor((u - 238) / 7);
    return bar >= 0 && bar < 5 && (u - 238) % 7 < 4.5 && z < 20 + [8, 13, 10, 17, 21][bar] ? (bar === 4 ? P.orange[2] : P.metal[3]) : "#f6f3ee";
  });
  decal(img, O, "u", 0, 290, 54, logoSign());
  // White wall tops (thickness T behind the inner faces) and the exposed ends.
  const cap = (u, v, x, y) => (u > -1 && v > -1 ? WALL_TOP[3] : u < -T + 1 || v < -T + 1 ? WALL_TOP[0] : tone(WALL_TOP, 0.7, x, y));
  top(img, O, HW, [-T, U], [-T, 0], cap);
  top(img, O, HW, [-T, 0], [-T, V], cap);
  faceU(img, O, U, [-T, 0], [0, HW], (v, z) => (z > HW - 1 ? WALL_TOP[3] : P.sideWall[0]));
  faceV(img, O, V, [-T, 0], [0, HW], (u, z) => (z > HW - 1 ? WALL_TOP[3] : P.sideWall[1]));
  img.fill((x, y) => { for (const z of [0, R.suite.z]) { const [u, v] = O.onZ(x, y, z); if (roomAt(u, v) && floorZ(u, v) === z && Math.min(u, v) >= 0 && Math.min(u, v) < 3) return true; } return false; }, [60, 40, 50, 46]);
}

function stairs(img) {
  const s = MAP.stairs, n = s.steps;
  for (let i = 0; i < n; i++) {
    const z = R.suite.z * (1 - (i + 1) / (n + 1));
    box(img, O, [s.u, s.v - 2, 0], [s.u + s.du, s.v + (i + 1) * s.depth, z], { top: (u, v, x, y) => (v > s.v + (i + 1) * s.depth - 1.5 ? P.orange[3] : tone(P.floor, 0.85, x, y)), left: (u, zz) => (zz > z - 1 ? P.shell[4] : P.floor[1]), right: solid(P.floor[0]), rim: false });
  }
  top(img, O, R.suite.z, [s.u, s.u + s.du], [s.v - 3, s.v], (u, v, x, y) => tone(P.floor, 0.85, x, y));
}

// Low partitions and glass, split into short chunks; each chunk's screen outline and sort row go to the map.
function wallChunks() {
  const chunks = [];
  for (const wall of MAP.walls) {
    const cuts = [wall.from, ...(wall.doors ?? []).flat(), wall.to];
    for (let i = 0; i < cuts.length; i += 2) {
      for (let a = cuts[i]; a < cuts[i + 1]; a += 8) {
        const b = Math.min(cuts[i + 1], a + 8), glass = !!wall.glass;
        const h = glass ? HG : wall.height ?? LOW;
        const box3 = wall.axis === "v" ? [[a, wall.at - T / 2, 0], [b, wall.at + T / 2, h]] : [[wall.at - T / 2, a, 0], [wall.at + T / 2, b, h]];
        chunks.push({ box3, glass });
      }
    }
  }
  return chunks;
}

function hull(points) {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function mapWalls() {
  const img = new Pixels(W, H), chunks = wallChunks();
  const order = c => c.box3[1][0] + c.box3[1][1];
  chunks.sort((p, q) => order(p) - order(q));
  for (const { box3: [lo, hi], glass } of chunks) {
    const h = hi[2];
    if (glass) {
      const pane = (s, z) => (z < 2 || z >= h - 2 ? P.shell[4] : s % 16 < 1.2 ? P.shell[3] : (s * 0.5 + z) % 22 < 2 ? [236, 248, 252, 170] : PANE);
      box(img, O, lo, hi, { top: solid(P.shell[4]), left: (u, z) => pane(u, z), right: (v, z) => pane(v, z), rim: false });
      continue;
    }
    const face = shade => (s, z, x, y) => (z < 2 ? P.metal[1] : z >= h - 5 && z < h - 3 ? P.orange[2] : tone(P.wall, shade - z / 90, x, y));
    box(img, O, lo, hi, { top: (u, v, x, y) => tone(WALL_TOP, 0.85, x, y, 0.4), left: face(0.82), right: face(0.55), rim: false });
    top(img, O, h, [lo[0], hi[0]], [lo[1], hi[1]], (u, v) => (u > hi[0] - 0.8 || v > hi[1] - 0.8 ? WALL_TOP[3] : null));
  }
  // Thin outline around the opaque wall runs so they read against pale floors.
  const marks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!img.get(x, y)[3] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => img.get(x + dx, y + dy)[3] === 255)) marks.push([x, y]);
  for (const [x, y] of marks) img.set(x, y, [58, 43, 51, 200]);
  const meta = chunks.map(({ box3: [lo, hi] }) => {
    const corners = [];
    for (const u of [lo[0], hi[0]]) for (const v of [lo[1], hi[1]]) for (const z of [0, hi[2]]) corners.push(O.at(u, v, z));
    const shape = hull(corners), cx = shape.reduce((s, p) => s + p[0], 0) / shape.length, cy = shape.reduce((s, p) => s + p[1], 0) / shape.length;
    // Grow each outline a little so it also covers the wall's outline pixels.
    const poly = shape.map(([x, y]) => [Math.round(x + Math.sign(x - cx) * 1.5), Math.round(y + Math.sign(y - cy) * 1.5)]);
    // Sort each piece by its back end on the wall's centre line: anything on the room side in front of the wall
    // (larger u for a wall along v, larger v for a wall along u) then draws over it, anything behind draws under it.
    return { poly, depth: lo[0] + lo[1] + T / 2 };
  });
  return { img, meta };
}

export function mapBuilding() {
  const img = new Pixels(W, H);
  skyAndPark(img);
  for (const t of MAP.trees.filter(t => t.y < 200)) tree(img, t.x, t.y, t.seed, t.size);
  parkFurniture(img);
  floors(img);
  backWalls(img);
  stairs(img);
  for (const t of MAP.trees.filter(t => t.y >= 200)) tree(img, t.x, t.y, t.seed, t.size);
  return img;
}

export function mapSprites() {
  for (const key of Object.keys(SPRITES)) delete SPRITES[key];
  stationPieces(); roundTable(); meetingTable(); bookshelf(); cabinet(); counter(); coffeeBar(); sofa();
  plant("plant", 21, 14); plant("plant-tall", 4, 26); lamp();
  return SPRITES;
}
