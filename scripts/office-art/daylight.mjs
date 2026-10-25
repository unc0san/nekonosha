// Daytime scenery around the office, shared by every room window and the whole-office map: a clear blue sky with
// white clouds, Mt. Fuji with its snowcap seen from Yamanashi, low blue hills, a line of trees and the lawn park the
// office stands in, with small flowers, trees and benches. Rooms on the same side of the building look at the same
// stretch of scenery: `pan` shifts a window along one shared panorama so Fuji stays in the same direction.
import { bayer, inEllipse, random } from "./lib/pixel.mjs";
import * as P from "./palette.mjs";

const D = P.day;
// Ramp color for a 0..1 value with ordered dithering between steps (same recipe as the rooms).
const tone = (ramp, t, x, y, spread = 1) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length + (bayer(x, y) - 0.5) * spread)))];
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// A puffy pixel cloud: three or four round puffs on a flat base, white on top and pale blue underneath.
export function cloud(img, inside, cx, cy, w, h) {
  const puffs = [[-0.32, 0.05, 0.55], [-0.08, -0.3, 0.8], [0.2, -0.12, 0.68], [0.38, 0.12, 0.45]];
  const base = cy + h * 0.38;
  const inCloud = (x, y) => y < base && puffs.some(([dx, dy, r]) => inEllipse(cx + dx * w, cy + dy * h, r * h * 1.25, r * h)(x, y));
  img.fill((x, y) => inside(x, y) && inCloud(x, y), (x, y) => {
    if (!inCloud(x, y + 2) || y > base - 2) return D.cloud[0];
    if (y > cy + h * 0.05) return tone(D.cloud, 0.45, x, y, 0.6);
    return !inCloud(x - 1, y - 1) ? D.cloud[3] : D.cloud[2];
  });
}

// Mt. Fuji: concave slopes, a short flat crater rim, lit from the upper left, snow streaking down the gullies and
// the base fading into the haze above the hills.
export function fuji(img, inside, { x: cx, base, height, half }) {
  const heightAt = x => {
    const d = Math.min(1, Math.max(0.05, Math.abs(x + 0.5 - cx) / half));
    return height * Math.max(0, 1 - d) ** 1.75 / (0.95 ** 1.75);
  };
  // Snow reaches about halfway down, in tongues that follow the gullies.
  const snowLine = x => base - height * 0.62 + Math.abs(x + 0.5 - cx) * 0.1 + Math.round(hash(Math.floor((x - cx) / 3)) * height * 0.12);
  img.fill((x, y) => inside(x, y) && y < base && y >= base - heightAt(x), (x, y) => {
    const lit = x + 0.5 < cx, gully = Math.abs(Math.sin((x - cx) * 0.42)) < 0.1;
    if (y < snowLine(x)) return lit ? (gully ? D.snow[1] : D.snow[2]) : gully ? D.snow[0] : D.snow[1];
    const haze = (y - (base - height * 0.28)) / (height * 0.28);
    if (haze > 0 && bayer(x, y) < haze * 0.7) return D.haze;
    return lit ? D.fuji[2] : D.fuji[1];
  });
}

// Far blue hills and a band of trees along the horizon; `p` is the panorama x for each screen x.
export function horizonBand(img, inside, horizon, p, { hills = true, flat = () => 1 } = {}) {
  const hillTop = x => horizon - 2 - Math.round((3 + 3 * Math.sin(p(x) / 23) + 2 * Math.sin(p(x) / 9 + 1)) * flat(x));
  if (hills) img.fill((x, y) => inside(x, y) && y < horizon && y >= hillTop(x), (x, y) => (y < hillTop(x) + 1 ? D.hills[1] : D.hills[0]));
  const crown = x => { const q = p(x), cell = Math.floor(q / 5), local = q - cell * 5 - 2.5, r = 2 + hash(cell, 3) * 2; return Math.round((r - local * local / (r * 1.6)) * flat(x)); };
  img.fill((x, y) => inside(x, y) && y < horizon && y >= horizon - 1 - Math.max(0, crown(x)), (x, y) => (y < horizon - 1 - Math.max(0, crown(x)) + 1 ? D.trees[2] : bayer(x, y) < 0.5 ? D.trees[1] : D.trees[0]));
}

export function flowerAt(img, x, y, rand, inside = () => true) {
  const color = D.flowers[Math.floor(rand() * D.flowers.length)], big = rand() < 0.5;
  const put = (px, py, c) => { if (inside(px, py)) img.set(px, py, c); };
  put(x, y, color);
  if (big) { put(x - 1, y, color); put(x + 1, y, color); put(x, y - 1, color); put(x, y, D.flowerHeart); }
  put(x, y + 1, D.grass[0]);
}

// Front-view park bench: two backrest slats, the seat and iron legs. `s` scales it for small windows.
export function bench(img, inside, x, y, s = 1) {
  const w = Math.round(16 * s), h = Math.max(4, Math.round(8 * s));
  const put = (px, py, c) => { if (inside(px, py)) img.set(px, py, c); };
  for (let i = 0; i < w; i++) {
    put(x + i, y, D.wood[2]); if (h > 5) put(x + i, y + 2, D.wood[1]);
    put(x + i, y + h - 3, D.wood[2]); put(x + i, y + h - 2, D.wood[0]);
  }
  for (const lx of [x + 1, x + w - 2]) for (let py = y; py < y + h + 1; py++) put(lx, py, D.iron);
  for (let i = -1; i <= w; i++) put(x + i, y + h + 1, [60, 90, 40, 70]);
}

// Round deciduous tree on the lawn, seen from the front.
export function parkTree(img, inside, x, y, r, seed) {
  const rand = random(seed);
  const put = (px, py, c) => { if (inside(px, py)) img.set(px, py, c); };
  img.fill((px, py) => inside(px, py) && inEllipse(x, y, r * 0.9, Math.max(1.5, r * 0.22))(px, py), [50, 90, 40, 80]);
  for (let py = Math.round(y - r * 1.1); py < y; py++) for (let px = Math.round(x - Math.max(1, r * 0.14)); px <= x + Math.max(0, r * 0.14); px++) put(px, py, px < x ? D.bark[1] : D.bark[0]);
  const blobs = Array.from({ length: 5 }, () => [x + (rand() - 0.5) * r * 1.2, y - r * 1.7 - rand() * r * 0.6, r * (0.55 + rand() * 0.25)]);
  blobs.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, br] of blobs) img.shade((px, py) => inside(px, py) && inEllipse(bx, by, br, br * 0.9)(px, py), (px, py) => { const nx = (px + 0.5 - bx) / br, ny = (py + 0.5 - by) / br; return [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))]; }, D.leaf, { bias: 0.05 });
}

// One window's worth of scenery, in the window's own pixels. `fuji` is the mountain's panorama x and size (or null),
// `benches` and `trees` are lists of [panorama x, y, size]; flowers grow thicker toward the bottom of the view.
export function outdoorView(img, inside, { top, horizon, bottom, pan = 0, fuji: mountain = null, clouds = [], benches = [], trees = [], seed = 1, hills = true }) {
  const p = x => x + pan;
  img.fill((x, y) => inside(x, y) && y < horizon, (x, y) => tone(D.sky, (y - top) / Math.max(1, horizon - top), x, y, 0.9));
  for (const [cx, cy, w, h] of clouds) cloud(img, inside, cx - pan, cy, w, h);
  if (mountain) fuji(img, inside, { ...mountain, x: mountain.x - pan, base: horizon - 1 });
  horizonBand(img, inside, horizon, p, { hills });
  const depth = Math.max(1, bottom - horizon);
  img.fill((x, y) => inside(x, y) && y >= horizon, (x, y) => {
    const t = (y - horizon) / depth, stripe = Math.floor((y - horizon) / Math.max(2, depth / 5)) % 2;
    return tone(D.grass, 0.2 + t * 0.7 + stripe * 0.1, x, y, 0.8);
  });
  const rand = random(seed);
  for (let y = horizon + 1; y < bottom; y++) for (let x = 0; x < img.width; x++) {
    if (!inside(x, y)) continue;
    const t = (y - horizon) / depth;
    if (rand() < 0.012 + t * 0.03) flowerAt(img, x, y, rand, inside);
    else if (rand() < 0.04) img.set(x, y, D.grass[0]);
  }
  for (const [bx, by, s] of benches) bench(img, inside, Math.round(bx - pan), by, s);
  for (const [tx, ty, r, s] of trees) parkTree(img, inside, tx - pan, ty, r, s ?? 1);
}
