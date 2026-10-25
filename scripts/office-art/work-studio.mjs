// Work studio: shares the president suite's palette, light direction and floor so the rooms read as one office.
import { Pixels, bayer, ellipseNormal, inEllipse, random, sheet } from "./lib/pixel.mjs";
import { onlyEmpty, roundedRect, tone } from "./president-room.mjs";
import * as P from "./palette.mjs";

const STAGE = { width: 368, height: 180, horizon: 78, left: 18, right: 350 };
const WINDOWS = [[34, 94], [114, 174], [194, 254], [274, 334]].map(([x0, x1]) => ({ x0, x1, y0: 6, y1: 46 }));
const GLOBE = ["#f0b871", "#ffd99a", "#fff0cf", "#fffaf0", "#ffffff"];

const glass = WINDOWS.map(w => roundedRect(w.x0 + 3, w.y0 + 3, w.x1 - 3, w.y1, 13));
const inGlass = (x, y) => glass.some(g => g(x, y));
const onFloor = (x, y) => y >= STAGE.horizon && y >= STAGE.horizon + (STAGE.left - x) * 1.1 && y >= STAGE.horizon + (x - STAGE.right) * 1.1;

const CITY = (() => {
  const rand = random(17), far = [], near = [];
  for (let x = 30; x < 340;) { const w = 5 + Math.floor(rand() * 9); far.push({ x, w, top: 24 + Math.floor(rand() * 14) }); x += w; }
  for (let x = 28; x < 340;) { const w = 7 + Math.floor(rand() * 12); near.push({ x, w, top: 29 + Math.floor(rand() * 13) }); x += w + Math.floor(rand() * 3); }
  const lights = [];
  for (const b of near) for (let y = b.top + 3; y < 45; y += 3) for (let x = b.x + 2; x < b.x + b.w - 2; x += 2) if (rand() < 0.45) lights.push([x, y, rand()]);
  return { far, near, lights };
})();

export function backdrop() {
  const { width, height, horizon, left, right } = STAGE;
  const img = new Pixels(width, height);
  img.fill((x, y) => y < horizon, (x, y) => tone(P.wall, 0.95 - Math.abs(x - width / 2) / 290 - (horizon - y) / 380, x, y));
  img.polygon([[0, 0], [left, 0], [left, horizon], [0, horizon + 20]], (x, y) => tone(P.sideWall, 0.55 + y / 400, x, y));
  img.polygon([[width, 0], [right, 0], [right, horizon], [width, horizon + 20]], (x, y) => tone(P.sideWall, 0.4 + y / 400, x, y));
  img.rect(left - 1, 0, 2, horizon, "#c2b4a8"); img.rect(right - 1, 0, 2, horizon, "#c2b4a8");

  // Same glossy floor and converging seams as the president suite.
  img.fill(onFloor, (x, y) => tone(P.floor, 0.25 + (y - horizon) / 120, x, y, 0.7));
  const vanish = { x: width / 2, y: -70 };
  for (let fx = -200; fx <= width + 200; fx += 30) for (let y = horizon + 1; y < height; y++) {
    const x = Math.round(vanish.x + (fx - vanish.x) * (y - vanish.y) / (height - vanish.y));
    if (onFloor(x, y)) img.set(x, y, [150, 136, 124, 28]);
  }
  for (const y of [86, 100, 122, 152]) img.fill((x, py) => py === y && onFloor(x, py), [150, 136, 124, 26]);
  for (const w of WINDOWS) img.fill((x, y) => onFloor(x, y) && y > horizon + 2 && y < horizon + 26 && x > w.x0 + 4 + (y - horizon) * 0.1 && x < w.x1 - 4 + (y - horizon) * 0.1, (x, y) => {
    const d = (y - horizon) / 26;
    return [255, 253, 248, d < 0.3 ? 110 : d < 0.6 ? 60 : 28];
  });
  img.rect(left + 1, horizon, right - left - 1, 2, [120, 100, 90, 70]);
  img.rect(left + 1, horizon - 4, right - left - 1, 4, P.wall[0]); img.rect(left + 1, horizon - 4, right - left - 1, 1, "#c8baad");

  // Space-age orange band running the length of the studio.
  img.rect(left + 1, 53, right - left - 1, 3, P.orange[2]); img.rect(left + 1, 53, right - left - 1, 1, P.orange[3]); img.rect(left + 1, 56, right - left - 1, 1, P.orange[0]);

  // Capsule windows onto the same night city.
  const rand = random(5);
  img.fill(inGlass, (x, y) => tone(P.sky, (y - 6) / 40 * 1.05, x, y, 1.2));
  for (let i = 0; i < 60; i++) { const x = 30 + Math.floor(rand() * 310), y = 9 + Math.floor(rand() * 18); if (inGlass(x, y)) img.set(x, y, rand() < 0.3 ? "#fff6dc" : [200, 210, 255, 150]); }
  for (const b of CITY.far) img.fill((x, y) => inGlass(x, y) && x >= b.x && x < b.x + b.w && y >= b.top, P.cityFar);
  for (const b of CITY.near) img.fill((x, y) => inGlass(x, y) && x >= b.x && x < b.x + b.w && y >= b.top, x => (x === b.x ? P.cityNear[1] : P.cityNear[0]));
  for (const [x, y, r] of CITY.lights) if (inGlass(x, y) && r > 0.18) img.set(x, y, r > 0.8 ? P.cityLights[1] : r > 0.4 ? P.cityLights[0] : P.cityLights[2]);
  WINDOWS.forEach((w, i) => {
    const outer = roundedRect(w.x0, w.y0, w.x1, w.y1 + 1, 16);
    img.fill((x, y) => outer(x, y) && !glass[i](x, y), (x, y) => tone(P.shell, y < w.y0 + 6 ? 0.9 : 0.65, x, y));
    img.fill((x, y) => glass[i](x, y) && Math.abs(x - (w.x0 + w.x1) / 2) <= 1, x => (x === (w.x0 + w.x1) / 2 + 1 ? P.shell[1] : P.shell[3]));
    img.fill((x, y) => glass[i](x, y) && x - (y - w.y0) * 0.45 >= w.x0 + 10 && x - (y - w.y0) * 0.45 < w.x0 + 13 && y < 30, [255, 255, 255, 30]);
    img.rect(w.x0 - 3, w.y1, w.x1 - w.x0 + 6, 3, P.shell[3]); img.rect(w.x0 - 3, w.y1 + 3, w.x1 - w.x0 + 6, 1, P.shell[1]);
    img.fill((x, y) => outer(x, y) && (!outer(x - 1, y) || !outer(x + 1, y) || !outer(x, y - 1)), "#b7aaa0");
  });
  return img;
}

export function cityTwinkle() {
  const frames = [0, 1].map(frame => {
    const img = new Pixels(STAGE.width, 48);
    for (const [x, y, r] of CITY.lights) if (inGlass(x, y) && r <= 0.18 && (r < 0.09) === (frame === 0)) img.set(x, y, P.cityLights[3]);
    return img;
  });
  return sheet(frames);
}

export function pendant() {
  const img = new Pixels(14, 26);
  img.rect(6, 0, 1, 15, P.metal[1]);
  img.rect(4, 13, 6, 2, P.orange[2]);
  img.outline(P.SOFT_OUTLINE);
  img.ball(7, 20, 5, 5, GLOBE, { bias: 0.15 });
  img.fill((x, y) => inEllipse(7, 20, 6, 6)(x, y) && !img.opaque(x, y), "#c87a3c");
  return img;
}

export function pendantGlow() {
  const img = new Pixels(48, 40);
  const alpha = [0, 24, 40, 58];
  img.fill(() => true, (x, y) => {
    const d = Math.hypot(x + 0.5 - 24, (y + 0.5 - 20) * 1.15) / 20;
    const level = d < 0.42 ? 3 : d < 0.68 ? 2 : d < 1 ? 1 : 0;
    return level ? [255, 214, 150, alpha[level]] : null;
  });
  return img;
}

export function floorLamp() {
  const img = new Pixels(18, 62);
  img.rect(8, 14, 2, 42, P.metal[2]); img.rect(9, 14, 1, 42, P.metal[1]);
  img.ball(9, 58, 7, 2.5, P.shell);
  img.outline(P.OUTLINE);
  img.ball(9, 9, 7.5, 7.5, GLOBE, { bias: 0.2 });
  img.fill((x, y) => inEllipse(9, 9, 8.5, 8.5)(x, y) && !img.opaque(x, y), "#c87a3c");
  onlyEmpty(img, inEllipse(9, 60, 10, 2), [70, 50, 40, 60]);
  return img;
}

// Small tulip side table for each desk.
export function sideTable() {
  const img = new Pixels(30, 40);
  img.shade((x, y) => y >= 12 && y < 34 && Math.abs(x + 0.5 - 15) < 1.5 + ((y - 12) / 22) ** 2 * 3.5, x => [(x + 0.5 - 15) / 5, 0, 0.9], P.shell);
  img.ball(15, 34, 8, 2.5, P.shell);
  img.ellipse(15, 10, 13, 4, P.shell[1]);
  img.ball(15, 9, 13, 4, ["#e2dcd4", "#efeae3", "#f8f5ef", "#fffdf9", "#ffffff"], { bias: 0.1 });
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(15, 37, 11, 2.5), [70, 40, 25, 70]);
  return img;
}

// Bean bag for the lounge; the front lip covers the bottom of a cat sitting in it.
export function beanbag() {
  const img = new Pixels(46, 28);
  const bag = (x, y) => inEllipse(23, 16, 21, 9)(x, y) && !inEllipse(23, 6, 12, 5)(x, y);
  img.shade(bag, ellipseNormal(23, 15, 21, 11), P.orange);
  img.fill((x, y) => bag(x, y) && Math.abs(x - 23) < 10 && y > 9 && y < 13 && bayer(x, y) < 0.4, P.orange[1]);
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(23, 25, 22, 3), [70, 30, 12, 80]);
  return { back: img, front: img.mask((x, y) => y >= 16) };
}
