// President's suite: every prop is its own sprite so it can be moved or swapped for hand-drawn PNGs later.
import { Pixels, bayer, ellipseNormal, inEllipse, random, sheet } from "./lib/pixel.mjs";
import * as P from "./palette.mjs";
import { outdoorView } from "./daylight.mjs";

const STAGE = { width: 320, height: 180, horizon: 96 };

// Picks a ramp color for a 0..1 value with ordered dithering between steps.
export const tone = (ramp, t, x, y, spread = 1) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length + (bayer(x, y) - 0.5) * spread)))];

export const onlyEmpty = (pixels, inside, color) => pixels.fill((x, y) => inside(x, y) && !pixels.opaque(x, y), color);

export function capsule(ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const project = (x, y) => Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / len));
  return {
    inside: (x, y) => { const t = project(x, y); return Math.hypot(x + 0.5 - ax - dx * t, y + 0.5 - ay - dy * t) <= r; },
    normal: (x, y) => {
      const t = project(x, y), nx = (x + 0.5 - ax - dx * t) / r, ny = (y + 0.5 - ay - dy * t) / r;
      return [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
    },
  };
}

export const roundedRect = (x0, y0, x1, y1, radius) => (x, y) => {
  const px = x + 0.5, py = y + 0.5;
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.max(x0 + radius, Math.min(x1 - radius, px)), cy = Math.max(y0 + radius, py);
  return py > y0 + radius || Math.hypot(px - cx, py - cy) <= radius;
};

// ---------- Room shell: walls, daylight window, glossy floor ----------

const WINDOW = { x0: 58, y0: 10, x1: 262, y1: 90, radius: 30 };
const MULLIONS = [99, 140, 180, 221];
const inGlass = roundedRect(WINDOW.x0 + 3, WINDOW.y0 + 3, WINDOW.x1 - 3, WINDOW.y1, WINDOW.radius - 3);

// The suite looks out over the lawn park toward Mt. Fuji (panorama x 0 is the mountain, as in every room).
export const SUITE_VIEW = {
  top: WINDOW.y0 + 3, horizon: 60, bottom: WINDOW.y1, pan: -226,
  fuji: { x: 0, height: 31, half: 47 },
  clouds: [[-140, 26, 30, 10], [-80, 40, 20, 6], [6, 18, 20, 6], [30, 44, 14, 4]],
  benches: [[-108, 73, 1], [-36, 77, 1]],
  trees: [[-151, 80, 9, 3], [-60, 66, 5, 8], [20, 72, 7, 5]],
  seed: 21,
};

export function backdrop() {
  const img = new Pixels(STAGE.width, STAGE.height);
  const { horizon } = STAGE;
  // Back wall with a soft warm falloff toward the corners.
  img.fill((x, y) => y < horizon, (x, y) => tone(P.wall, 0.95 - Math.abs(x - 160) / 260 - (horizon - y) / 420, x, y));
  // Side walls turn the room into a shallow box, which sells the 3/4 view.
  img.polygon([[0, 0], [18, 0], [18, horizon], [0, horizon + 20]], (x, y) => tone(P.sideWall, 0.55 + y / 400, x, y));
  img.polygon([[320, 0], [302, 0], [302, horizon], [320, horizon + 20]], (x, y) => tone(P.sideWall, 0.4 + y / 400, x, y));
  img.rect(17, 0, 2, horizon, "#c2b4a8"); img.rect(301, 0, 2, horizon, "#c2b4a8");
  // Glossy floor that brightens toward the viewer.
  img.fill((x, y) => y >= horizon && y >= horizon + (18 - x) * 1.1 && y >= horizon + (x - 302) * 1.1, (x, y) => tone(P.floor, 0.25 + (y - horizon) / 110, x, y, 0.7));
  // Board seams converge on a vanishing point above the window.
  const vanish = { x: 160, y: -70 };
  for (let fx = -160; fx <= 480; fx += 30) {
    for (let y = horizon + 1; y < STAGE.height; y++) {
      const x = Math.round(vanish.x + (fx - vanish.x) * (y - vanish.y) / (STAGE.height - vanish.y));
      if (img.opaque(x, y) && y >= horizon + (18 - x) * 1.1 && y >= horizon + (x - 302) * 1.1) img.set(x, y, [150, 136, 124, 28]);
    }
  }
  for (const y of [104, 118, 140, 170]) img.fill((x, py) => py === y && py >= horizon + (18 - x) * 1.1 && py >= horizon + (x - 302) * 1.1, [150, 136, 124, 26]);
  // Window light pooled on the glossy floor, broken by the mullion shadows.
  img.fill((x, y) => y > horizon + 2 && y < horizon + 34 && x > WINDOW.x0 + 10 && x < WINDOW.x1 - 10 && !MULLIONS.some(m => Math.abs(x - (160 + (m - 160) * 1.08)) < 2), (x, y) => {
    const d = (y - horizon) / 34;
    return [255, 253, 248, d < 0.3 ? 120 : d < 0.6 ? 70 : 32];
  });
  // Faint reflection of the blue sky right under the sill.
  img.fill((x, y) => y > horizon + 2 && y < horizon + 8 && x > WINDOW.x0 + 10 && x < WINDOW.x1 - 10, [140, 190, 235, 30]);
  // Contact shadow under the baseboard.
  img.rect(19, horizon, 283, 2, [120, 100, 90, 70]);
  img.rect(19, horizon - 4, 283, 4, P.wall[0]); img.rect(19, horizon - 4, 283, 1, "#c8baad");

  // Daylight: sky, clouds, Mt. Fuji and the lawn park.
  outdoorView(img, inGlass, SUITE_VIEW);
  // Glass sheen.
  for (const [x0, w] of [[78, 5], [92, 2], [196, 4]]) img.fill((x, y) => inGlass(x, y) && x - (y - WINDOW.y0) * 0.45 >= x0 && x - (y - WINDOW.y0) * 0.45 < x0 + w && y < 60, [255, 255, 255, 30]);

  // Window frame, mullions and sill.
  const frameOuter = roundedRect(WINDOW.x0, WINDOW.y0, WINDOW.x1, WINDOW.y1 + 1, WINDOW.radius);
  img.fill((x, y) => frameOuter(x, y) && !inGlass(x, y), (x, y) => tone(P.shell, y < WINDOW.y0 + 6 ? 0.9 : 0.65, x, y));
  for (const m of MULLIONS) img.fill((x, y) => inGlass(x, y) && x >= m - 1 && x <= m + 1, x => (x === m + 1 ? P.shell[1] : P.shell[3]));
  img.fill((x, y) => inGlass(x, y) && y >= 64 && y <= 65, (x, y) => (y === 65 ? P.shell[1] : P.shell[3]));
  img.rect(WINDOW.x0 - 4, WINDOW.y1, WINDOW.x1 - WINDOW.x0 + 8, 3, P.shell[3]); img.rect(WINDOW.x0 - 4, WINDOW.y1 + 3, WINDOW.x1 - WINDOW.x0 + 8, 1, P.shell[1]);
  img.fill((x, y) => frameOuter(x, y) && !frameOuter(x - 1, y) || frameOuter(x, y) && !frameOuter(x + 1, y) || frameOuter(x, y) && !frameOuter(x, y - 1), "#b7aaa0");
  return img;
}

// ---------- Lighting ----------

const GLOBES = [[18, 24, 5], [32, 15, 4.5], [46, 27, 5.5], [60, 16, 5], [74, 27, 5.5], [88, 15, 4.5], [102, 24, 5], [25, 37, 4], [53, 40, 4.5], [81, 39, 4], [95, 36, 4], [67, 42, 4]];
const HUB = [60, 8];

export function chandelier() {
  const img = new Pixels(120, 50);
  img.rect(59, 0, 2, 8, P.metal[1]);
  const brass = ["#b5571e", "#e07a2c", "#f6a248"];
  for (const [x, y] of GLOBES) img.line(HUB[0], HUB[1], x, y, brass[1]);
  for (let i = 0; i < GLOBES.length; i++) {
    const [ax, ay] = GLOBES[i], [bx, by] = GLOBES[(i + 1) % 7];
    if (i < 6) img.line(ax, ay, bx, by, brass[0]);
  }
  img.ellipse(HUB[0], HUB[1] + 1, 4, 2.5, brass[2]);
  img.outline(P.SOFT_OUTLINE);
  for (const [x, y, r] of GLOBES) img.ball(x, y, r, r, ["#f0b871", "#ffd99a", "#fff0cf", "#fffaf0", "#ffffff"], { bias: 0.15 });
  for (const [x, y, r] of GLOBES) img.fill((px, py) => inEllipse(x, y, r + 1, r + 1)(px, py) && !inEllipse(x, y, r, r)(px, py) && !img.opaque(px, py), "#c87a3c");
  return img;
}

// Warm halo drawn as a separate layer so it can pulse without touching the lamp sprite.
export function chandelierGlow() {
  const img = new Pixels(180, 90);
  // Stepped bands rather than dithering, like a 16-bit era light halo.
  const alpha = [0, 26, 44, 64];
  img.fill(() => true, (x, y) => {
    const d = Math.min(...GLOBES.map(([gx, gy, r]) => Math.hypot(x + 0.5 - gx - 30, y + 0.5 - gy - 10) / (r * 3.4)));
    const level = d < 0.42 ? 3 : d < 0.68 ? 2 : d < 1 ? 1 : 0;
    return level ? [255, 214, 150, alpha[level]] : null;
  });
  return img;
}

export function catLamp() {
  const img = new Pixels(32, 40);
  img.rect(15, 0, 1, 14, P.metal[0]);
  const dome = (x, y) => inEllipse(16, 25, 13, 11)(x, y) && y < 28;
  img.shade(dome, ellipseNormal(16, 25, 13, 11), P.orange);
  img.polygon([[5, 19], [7, 11], [12, 16]], P.orange[2]); img.polygon([[20, 16], [25, 11], [27, 19]], P.orange[2]);
  img.rect(3, 28, 26, 2, "#fff4e0");
  img.outline(P.OUTLINE);
  img.rect(10, 21, 2, 1, P.OUTLINE); img.rect(20, 21, 2, 1, P.OUTLINE);
  img.set(15, 23, P.OUTLINE); img.set(16, 23, P.OUTLINE); img.set(14, 22, P.OUTLINE); img.set(17, 22, P.OUTLINE);
  img.fill((x, y) => y >= 31 && y < 40 && Math.abs(x - 16) < 6 + (y - 31) * 1.4, (x, y) => (bayer(x, y) < 0.55 - (y - 31) / 18 ? [255, 214, 150, 140] : null));
  return img;
}

// ---------- Furniture ----------

export function eggBookshelf() {
  const img = new Pixels(46, 70);
  const egg = (x, y) => ((x + 0.5 - 23) / (y < 30 ? 17 + (y - 4) * 0.13 : 20.5)) ** 2 + ((y + 0.5 - 32) / 30) ** 2 <= 1;
  img.shade(egg, ellipseNormal(23, 32, 21, 30), P.shell);
  const nook = inEllipse(23, 33, 15, 24);
  img.fill(nook, (x, y) => tone(["#9d3a16", "#bf4c1c", "#d65d22"], 0.25 + (y - 10) / 80 + (x - 10) / 90, x, y));
  for (const shelfY of [24, 38, 50]) img.fill((x, y) => nook(x, y) && (y === shelfY || y === shelfY + 1), (x, y) => (y === shelfY ? P.shell[3] : P.shell[1]));
  const rand = random(5);
  let x = 13;
  while (x < 30) { const w = 2 + Math.floor(rand() * 2), h = 7 + Math.floor(rand() * 4); img.fill((px, py) => nook(px, py) && px >= x && px < x + w && py < 38 && py >= 38 - h, P.books[Math.floor(rand() * P.books.length)]); x += w; }
  x = 25;
  while (x < 34) { const w = 2, h = 6 + Math.floor(rand() * 4); img.fill((px, py) => nook(px, py) && px >= x && px < x + w && py < 50 && py >= 50 - h, P.books[Math.floor(rand() * P.books.length)]); x += w + 1; }
  // Little gray cat figurine on the top shelf.
  img.ellipse(19, 21, 3, 3, P.metal[3]); img.polygon([[16, 19], [17, 16], [19, 18]], P.metal[3]); img.polygon([[20, 18], [22, 16], [22, 19]], P.metal[3]);
  img.rect(17, 20, 1, 1, P.OUTLINE); img.rect(21, 20, 1, 1, P.OUTLINE);
  img.ellipse(25, 22, 2, 2, "#ffd26e");
  img.ellipse(16, 48, 3, 2.5, P.leaf[3]); img.rect(15, 49, 3, 1, P.orange[2]);
  img.rect(19, 61, 8, 4, P.shell[2]); img.ellipse(23, 65, 9, 2.5, P.shell[3]);
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(23, 67, 14, 3), [70, 50, 40, 60]);
  return img;
}

export function leafShape(img, bx, by, angle, length, width, rand) {
  const tipX = bx + Math.cos(angle) * length, tipY = by + Math.sin(angle) * length;
  const cx = (bx + tipX) / 2, cy = (by + tipY) / 2;
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  const inside = (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; const u = dx * cos - dy * sin, v = dx * sin + dy * cos; return (u / (length / 2)) ** 2 + (v / width) ** 2 <= 1; };
  const shift = rand() * 0.15;
  img.shade(inside, (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; const v = dx * sin + dy * cos; return [Math.sin(angle) * 0.2 - v / width * 0.6 * Math.sin(angle), -0.6 + v / width * 0.4 * Math.cos(angle), 0.6]; }, P.leaf, { bias: shift });
  img.line(bx, by, Math.round(bx + (tipX - bx) * 0.8), Math.round(by + (tipY - by) * 0.8), P.leaf[1]);
}

export function plant(seed, { width = 40, height = 64, potColor = "shell" } = {}) {
  const img = new Pixels(width, height);
  const rand = random(seed);
  const base = [width / 2, height - 20];
  const leaves = Array.from({ length: 9 }, (_, i) => ({ angle: -Math.PI / 2 + (i - 4) * 0.36 + (rand() - 0.5) * 0.2, length: 16 + rand() * (height - 40), width: 3.5 + rand() * 1.5 }));
  leaves.sort((a, b) => Math.abs(b.angle + Math.PI / 2) - Math.abs(a.angle + Math.PI / 2));
  for (const l of leaves) leafShape(img, base[0], base[1], l.angle, l.length, l.width, rand);
  const potTop = height - 20, ramp = potColor === "shell" ? P.shell : P.orange;
  img.shade((x, y) => y >= potTop && y < height - 3 && Math.abs(x + 0.5 - width / 2) < 8 - (y - potTop) * 0.12, (x) => [(x + 0.5 - width / 2) / 8, -0.2, 0.8], ramp);
  img.rect(width / 2 - 8, potTop, 16, 2, ramp[3]);
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(width / 2, height - 3, 11, 2.5), [70, 50, 40, 60]);
  return img;
}

export function rug(width = 214, height = 56, ramp = P.rugOrange) {
  const img = new Pixels(width, height);
  const cx = width / 2, cy = height / 2, rx = cx - 3, ry = cy - 3;
  const rand = random(9);
  const jitter = Array.from({ length: 360 }, () => rand() * 0.035);
  const inside = (x, y) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; const a = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 359); return dx * dx + dy * dy <= 1 - jitter[a]; };
  img.fill(inside, (x, y) => {
    const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
    if (Math.abs(d - 0.72) < 0.03 || Math.abs(d - 0.4) < 0.035) return ramp[3];
    if (d > 0.9) return tone(ramp, 0.25 - (y - cy) / 200, x, y, 1.5);
    return tone(ramp, 0.55 - (y - cy) / 90 + (rand() - 0.5) * 0.25, x, y, 1.6);
  });
  // Fuzzy pile along the rim.
  img.fill((x, y) => !inside(x, y) && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1)) && rand() < 0.6, ramp[0]);
  onlyEmpty(img, (x, y) => inside(x, y - 1) && !inside(x, y), [120, 50, 20, 120]);
  return img;
}

export function tulipTable() {
  const img = new Pixels(68, 58);
  const cx = 34;
  img.shade((x, y) => y >= 26 && y < 48 && Math.abs(x + 0.5 - cx) < 2.5 + ((y - 26) / 22) ** 2 * 7, (x) => [(x + 0.5 - cx) / 8, 0, 0.9], P.shell);
  img.ball(cx, 49, 15, 4.5, P.shell);
  img.ellipse(cx, 23, 31, 7, P.shell[1]);
  img.ball(cx, 21, 31, 7, ["#e2dcd4", "#efeae3", "#f8f5ef", "#fffdf9", "#ffffff"], { bias: 0.1 });
  img.fill(inEllipse(cx - 9, 19, 10, 2), [255, 255, 255, 140]);
  // Tiny potted sprout in the middle of the table.
  img.shade((x, y) => y >= 13 && y < 20 && Math.abs(x + 0.5 - cx) < 4 - (y - 13) * 0.2, (x) => [(x + 0.5 - cx) / 4, 0, 0.8], P.orange);
  leafShape(img, cx, 13, -2.2, 8, 2.2, random(1)); leafShape(img, cx, 13, -1.0, 8, 2.2, random(2)); leafShape(img, cx, 13, -1.6, 10, 2.2, random(3));
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(cx, 52, 20, 4.5), [90, 30, 10, 90]);
  return img;
}

// Egg chair opening to the right. Returns the shell (behind the cat) and the rim/base (in front of it).
export function eggChair() {
  const img = new Pixels(56, 68);
  const cx = 26, cy = 31;
  const egg = (x, y) => ((x + 0.5 - cx) / (y < cy ? 18.5 + (y - 6) * 0.15 : 22)) ** 2 + ((y + 0.5 - cy) / 28) ** 2 <= 1;
  const opening = inEllipse(31, 33, 17, 22);
  img.rect(cx - 2, 56, 5, 6, P.shell[2]); img.rect(cx + 1, 56, 2, 6, P.shell[1]);
  img.ball(cx, 62, 13, 3.5, P.shell);
  img.shade(egg, ellipseNormal(cx, cy, 22, 28), P.shell);
  img.fill(opening, (x, y) => tone(P.orange, 0.15 + (y - 11) / 70 + (x - 14) / 120, x, y, 1.2));
  // Seat cushion catches the light.
  img.ball(31, 49, 15, 6, [P.orange[2], P.orange[3], P.orange[4]]);
  img.fill((x, y) => opening(x, y) && !opening(x + 2, y) && y > 14 && y < 50, [255, 255, 255, 110]);
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(cx, 64, 17, 3.5), [70, 30, 12, 90]);
  const front = img.mask((x, y) => y >= 47 || (y >= 36 && !opening(x, y)));
  return { back: img, front };
}

// Long space-age desk for two: a white racetrack top with an orange edge, a recessed panel and tulip feet. The
// executives sit at either end facing each other, a laptop in front of each, a plant and two mugs in the middle.
// `top` is the surface and what stands on it (behind the cats' bodies); `front` is the edge, panel and feet (in front).
export const DUO_DESK = { w: 136, h: 50, surface: 24 };
export function duoDesk() {
  const { w, h, surface } = DUO_DESK, img = new Pixels(w, h), cx = w / 2;
  const onTop = (x, y) => ((Math.max(0, Math.abs(x + 0.5 - cx) - 46) / 9) ** 2 + ((y + 0.5 - 16) / 8) ** 2) <= 1;
  const edge = (x, y) => !onTop(x, y) && onTop(x, y - 3);
  // Tulip feet and the recessed modesty panel between them.
  for (const fx of [30, w - 30]) {
    img.ball(fx, h - 4, 10, 3, P.shell);
    img.shade((x, y) => y >= 24 && y < h - 4 && Math.abs(x + 0.5 - fx) < 2.5 + ((y - 24) / 22) ** 2 * 6, x => [(x + 0.5 - fx) / 8, 0, 0.9], P.shell);
  }
  img.fill((x, y) => x >= 36 && x < w - 36 && y >= 24 && y < 40, (x, y) => (y >= 31 && y < 33 ? P.orange[2] : tone(P.shell, 0.62 - (y - 24) / 80, x, y, 0.6)));
  img.fill(edge, (x, y) => (onTop(x, y - 1) ? P.orange[3] : onTop(x, y - 2) ? P.orange[2] : P.orange[1]));
  img.fill(onTop, (x, y) => tone(["#e2dcd4", "#efeae3", "#f8f5ef", "#fffdf9", "#ffffff"], 0.95 - (y - 8) / 40 - Math.abs(x - cx) / 400, x, y, 0.6));
  img.fill((x, y) => onTop(x, y) && y < 13 && x > 22 && x < 60, [255, 255, 255, 120]);
  // Plant in an orange pot and two mugs.
  img.shade((x, y) => y >= 9 && y < 17 && Math.abs(x + 0.5 - cx) < 4.5 - (y - 9) * 0.2, x => [(x + 0.5 - cx) / 4, 0, 0.8], P.orange);
  img.rect(cx - 5, 9, 10, 1, P.orange[3]);
  leafShape(img, cx, 9, -2.3, 9, 2.4, random(1)); leafShape(img, cx, 9, -0.9, 9, 2.4, random(2)); leafShape(img, cx, 9, -1.6, 11, 2.4, random(3)); leafShape(img, cx, 9, -1.95, 8, 2, random(4));
  for (const [mx, color] of [[cx - 14, P.shell], [cx + 11, P.orange]]) {
    img.shade((x, y) => x >= mx && x < mx + 5 && y >= 12 && y < 18, x => [(x + 0.5 - mx - 2.5) / 3, 0, 0.8], color);
    img.rect(mx, 12, 5, 1, "#6a4433"); img.rect(mx + 5, 13, 1, 1, color[1]); img.rect(mx + 6, 14, 1, 2, color[1]); img.rect(mx + 5, 16, 1, 1, color[1]);
  }
  img.outline(P.OUTLINE);
  onlyEmpty(img, (x, y) => y >= h - 3 && (Math.abs(x + 0.5 - 30) < 13 || Math.abs(x + 0.5 - (w - 30)) < 13), [90, 30, 10, 80]);
  return { top: img.mask((x, y) => y < surface), front: img.mask((x, y) => y >= surface) };
}

export function laptop() {
  const img = new Pixels(20, 16);
  img.polygon([[2, 13], [17, 11], [19, 14], [4, 16]], P.metal[2]);
  img.polygon([[3, 1], [15, 0], [17, 12], [4, 14]], (x, y) => tone(P.metal, 0.35 + (y / 30) - (x / 60), x, y));
  img.line(4, 13, 17, 11, P.metal[4]);
  // Paw logo on the lid.
  img.ellipse(10, 8, 2.2, 1.8, "#f3f1ec"); for (const [x, y] of [[7, 4], [9, 3], [11, 3], [13, 4]]) img.set(x, y, "#f3f1ec");
  img.outline(P.OUTLINE);
  return img;
}

// ---------- Cats ----------

function catFrame(name, { pose, frame, blink = false }) {
  const c = P.cats[name];
  const img = new Pixels(42, 50);
  const resting = pose === "rest";
  const hy = 15 + (resting ? frame : 0);
  const head = (x, y) => inEllipse(17, hy, 12.5, 10)(x, y) || inEllipse(17, hy + 4, 14, 6.5)(x, y);
  const headNormal = ellipseNormal(17, hy + 1, 14, 11.5);
  const torso = inEllipse(18, 38, 11, 11.5);
  const torsoNormal = ellipseNormal(18, 38, 11, 11.5);

  // Body.
  if (name === "shirasu") {
    img.shade(torso, torsoNormal, c.suit);
    img.polygon([[14, 26], [22, 26], [18, 34]], P.shell[3]);
    img.polygon([[17, 27], [19, 27], [20, 34], [18, 36], [16, 34]], P.orange[2]);
    img.rect(17, 27, 2, 2, P.orange[3]);
    img.line(13, 27, 17, 36, c.suit[3]); img.line(23, 27, 19, 36, c.suit[3]);
  } else {
    img.shade(torso, torsoNormal, c.fur);
    img.ball(18, 36, 6.5, 8, c.cream);
    for (const sy of [32, 37, 42]) img.fill((x, y) => torso(x, y) && !inEllipse(18, 36, 6.5, 8)(x, y) && y === sy + Math.round(Math.abs(x - 18) / 6), c.mark[1]);
  }

  // Arms reach for the laptop while typing, or fold in front while dozing.
  const pawUp = resting ? [0, 0] : frame === 0 ? [-1, 0] : [0, -1];
  const sleeve = name === "shirasu" ? c.suit : c.fur;
  const arms = resting
    ? [[16, 33, 13, 42, 0], [20, 33, 23, 42, 0]]
    : [[22, 31, 31, 33 + pawUp[0], 0], [23, 35, 33, 38 + pawUp[1], 1]];
  for (const [ax, ay, bx, by] of arms) {
    const arm = capsule(ax, ay, bx, by, 3.2);
    img.shade(arm.inside, arm.normal, sleeve);
    img.ball(bx + (resting ? 0 : 1.5), by + (resting ? 1.5 : 0), 3.2, 2.6, c.fur.length > 3 ? c.fur.slice(1) : c.fur);
  }

  // Head with coat markings.
  const ramp = (x, y) => {
    if (name === "shirasu") {
      const blaze = Math.abs(x + 0.5 - 17) < (y - hy + 9) * 0.55;
      return (y < hy + 1 && !blaze) || (x < 8 && y < hy + 3) ? c.mark : c.fur;
    }
    return inEllipse(17, hy + 5.5, 8, 4.5)(x, y) ? c.cream : c.fur;
  };
  img.shade(head, headNormal, ramp);
  const earL = [[5, hy - 3], [7, hy - 14], [15, hy - 8]], earR = [[19, hy - 8], [28, hy - 14], [30, hy - 3]];
  const earRamp = name === "shirasu" ? c.mark : c.fur;
  img.polygon(earL, earRamp[2]); img.polygon(earR, earRamp[1]);
  img.polygon([[7, hy - 5], [8, hy - 11], [12, hy - 8]], "#f2a3b0"); img.polygon([[22, hy - 8], [27, hy - 11], [28, hy - 5]], "#e48d9c");
  if (name === "ponzu") {
    for (const sx of [13, 17, 21]) img.rect(sx, hy - 9, 1, 4 - Math.abs(sx - 17) / 4, c.mark[0]);
    for (const [sx, sy] of [[4, hy + 1], [4, hy + 3], [28, hy + 1], [28, hy + 3]]) img.rect(sx, sy, 3, 1, c.mark[1]);
    img.rect(8, hy + 10, 20, 2, c.ribbon[1]); img.rect(8, hy + 11, 20, 1, c.ribbon[0]);
    img.ball(18, hy + 13, 1.8, 1.8, ["#c98d1f", "#f2c14a", "#fff0a8"]);
  }
  img.outline(P.OUTLINE);

  // Face details go on after the outline so they stay crisp.
  if (resting || blink) {
    for (const ex of [10, 22]) { img.rect(ex, hy + 1, 4, 1, c.eye); img.set(ex - 1, hy, c.eye); img.set(ex + 4, hy, c.eye); }
  } else {
    for (const ex of [10, 22]) {
      img.rect(ex, hy - 2, 3, 4, c.eye); img.set(ex + 1, hy - 3, c.eye); img.set(ex + 1, hy + 2, c.eye);
      img.set(ex, hy - 2, "#ffffff"); img.set(ex + 2, hy + 1, [255, 255, 255, 170]);
    }
  }
  img.rect(16, hy + 3, 2, 1, "#ec7f95");
  img.set(16, hy + 4, P.OUTLINE); img.set(17, hy + 4, P.OUTLINE); img.set(15, hy + 5, P.OUTLINE); img.set(18, hy + 5, P.OUTLINE);
  for (const bx of [7, 25]) img.rect(bx, hy + 3, 3, 1, [255, 140, 160, 150]);
  for (const [x0, x1, y] of [[-1, 3, hy + 2], [-1, 3, hy + 5], [31, 35, hy + 2], [31, 35, hy + 5]]) img.line(x0 + 1, y, x1, y + (y > hy + 3 ? 1 : 0), [90, 70, 80, 150]);
  if (name === "ponzu") {
    // Pink ribbon on the right ear.
    const r = c.ribbon, bx = 29, by = hy - 11;
    img.polygon([[bx - 6, by - 3], [bx, by], [bx - 6, by + 3]], r[1]); img.polygon([[bx + 6, by - 3], [bx, by], [bx + 6, by + 3]], r[1]);
    img.set(bx - 5, by - 1, r[2]); img.set(bx + 4, by - 1, r[2]);
    img.ellipse(bx, by, 1.6, 1.6, r[2]);
    const bow = img.mask((x, y) => Math.abs(x - bx) <= 7 && Math.abs(y - by) <= 4);
    const ring = new Pixels(42, 50).blit(bow, 0, 0).outline(P.OUTLINE);
    img.blit(ring.mask((x, y) => !bow.opaque(x, y) && !img.opaque(x, y) || bow.opaque(x, y)), 0, 0);
  }
  return img;
}

export function catSheet(name, pose) {
  return sheet([0, 1].map(frame => catFrame(name, { pose, frame })));
}

// Just the closed eyelids, layered on top for an occasional blink.
export function catBlink(name) {
  return catFrame(name, { pose: "type", frame: 0, blink: true }).mask((x, y) => y >= 11 && y <= 18 && ((x >= 9 && x <= 14) || (x >= 21 && x <= 26)));
}

// `torso` is the body ellipse in tail-sprite pixels; the base is clipped there so the tail grows from behind the hip.
export function tailSheet(name, torso) {
  const c = P.cats[name];
  return tailFrames(name === "shirasu" ? c.mark : c.fur, torso, name === "ponzu" ? c.mark[1] : null);
}

export function tailFrames(ramp, torso, stripe) {
  const behindBody = inEllipse(torso.x, torso.y, torso.rx + 1, torso.ry + 1);
  const frames = [0, 1, 2, 1].map(step => {
    const img = new Pixels(16, 16);
    // Only the tip flicks; the base stays put so the tail never detaches from the body.
    const sway = step * 0.7;
    const curve = [[15, 5], [8, 3], [2, 7], [3 + sway, 13 - sway]];
    const points = Array.from({ length: 14 }, (_, i) => {
      const t = i / 13, u = 1 - t;
      return [0, 1].map(k => u ** 3 * curve[0][k] + 3 * u * u * t * curve[1][k] + 3 * u * t * t * curve[2][k] + t ** 3 * curve[3][k]);
    });
    points.forEach(([x, y], i) => img.ball(x, y, 2.5 - i * 0.05, 2.5 - i * 0.05, ramp));
    if (stripe) for (const i of [6, 9, 12]) img.ellipse(points[i][0], points[i][1], 2, 1, stripe);
    img.outline(P.OUTLINE);
    return img.mask((x, y) => !behindBody(x, y));
  });
  return sheet(frames);
}
