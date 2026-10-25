// Glass meeting room: same palette, light and floor as the other rooms, with glass partitions instead of solid walls.
import { Pixels, inEllipse, random, sheet } from "./lib/pixel.mjs";
import { onlyEmpty, tone } from "./president-room.mjs";
import * as P from "./palette.mjs";

const STAGE = { width: 368, height: 180, horizon: 70, left: 18, right: 350 };
const GLASS = { x0: 252, x1: 350, y0: 6, y1: 66 };
const onFloor = (x, y) => y >= STAGE.horizon && y >= STAGE.horizon + (STAGE.left - x) * 1.1 && y >= STAGE.horizon + (x - STAGE.right) * 1.1;
const TINT = [196, 226, 236, 70];

// The open office seen through glass: pale, low-contrast shapes so it stays in the background.
function beyond(img, inside, seed) {
  const rand = random(seed);
  img.fill(inside, (x, y) => tone(["#d9d4cc", "#e3ded6", "#ece8e1"], 0.4 + y / 200, x, y));
  img.fill((x, y) => inside(x, y) && y > 46, (x, y) => tone(["#cfc9c0", "#d9d3cb"], 0.5, x, y));
  for (let i = 0; i < 4; i++) {
    const cx = Math.floor(rand() * 368), w = 10 + Math.floor(rand() * 10);
    img.fill((x, y) => inside(x, y) && Math.abs(x - cx) < w && y > 40 && y < 47, "#f2eee8");
    img.fill((x, y) => inside(x, y) && Math.abs(x - cx + w / 2) < 3 && y >= 34 && y <= 40, "#f0a066");
  }
  img.fill(inside, TINT);
}

export function backdrop() {
  const { width, height, horizon, left, right } = STAGE;
  const img = new Pixels(width, height);
  img.fill((x, y) => y < horizon && x > left && x < right, (x, y) => tone(P.wall, 0.95 - Math.abs(x - 140) / 300 - (horizon - y) / 380, x, y));
  // Side walls are glass partitions.
  const leftGlass = (x, y) => x <= left && y < horizon + (left - x) * 1.1;
  const rightGlass = (x, y) => x >= right && y < horizon + (x - right) * 1.1;
  beyond(img, leftGlass, 3); beyond(img, rightGlass, 4);
  // Back wall glass section on the right.
  const backGlass = (x, y) => x >= GLASS.x0 && x <= GLASS.x1 && y >= GLASS.y0 && y <= GLASS.y1;
  beyond(img, backGlass, 9);

  img.fill(onFloor, (x, y) => tone(P.floor, 0.25 + (y - horizon) / 120, x, y, 0.7));
  const vanish = { x: width / 2, y: -70 };
  for (let fx = -200; fx <= width + 200; fx += 30) for (let y = horizon + 1; y < height; y++) {
    const x = Math.round(vanish.x + (fx - vanish.x) * (y - vanish.y) / (height - vanish.y));
    if (onFloor(x, y)) img.set(x, y, [150, 136, 124, 28]);
  }
  for (const y of [80, 96, 120, 152]) img.fill((x, py) => py === y && onFloor(x, py), [150, 136, 124, 26]);
  img.rect(left + 1, horizon, right - left - 1, 2, [120, 100, 90, 70]);
  img.rect(left + 1, horizon - 4, GLASS.x0 - left - 4, 4, P.wall[0]); img.rect(left + 1, horizon - 4, GLASS.x0 - left - 4, 1, "#c8baad");
  img.rect(left + 1, 60, GLASS.x0 - left - 4, 2, P.orange[2]); img.rect(left + 1, 62, GLASS.x0 - left - 4, 1, P.orange[0]);

  // Aluminium frames and mullions for all the glass.
  const frame = (x, y, w, h) => { img.rect(x, y, w, h, P.metal[3]); img.rect(x + w - 1, y, 1, h, P.metal[1]); };
  frame(GLASS.x0 - 3, 0, 3, horizon); frame(GLASS.x0, GLASS.y0 - 3, GLASS.x1 - GLASS.x0, 3); frame(GLASS.x0, GLASS.y1, GLASS.x1 - GLASS.x0, 4);
  for (const x of [284, 317]) frame(x, GLASS.y0, 2, GLASS.y1 - GLASS.y0);
  frame(left - 1, 0, 3, horizon + 1); frame(right - 1, 0, 3, horizon + 1);
  img.polygon([[0, horizon + 19], [left, horizon], [left, horizon + 3], [0, horizon + 22]], P.metal[2]);
  img.polygon([[width, horizon + 19], [right, horizon], [right, horizon + 3], [width, horizon + 22]], P.metal[2]);
  img.rect(0, 36, left, 2, P.metal[3]); img.rect(right, 36, width - right, 2, P.metal[3]);
  // Glass sheen.
  for (const x0 of [258, 262, 324]) img.fill((x, y) => backGlass(x, y) && x - (y - GLASS.y0) * 0.5 >= x0 && x - (y - GLASS.y0) * 0.5 < x0 + 3, [255, 255, 255, 60]);
  img.fill((x, y) => leftGlass(x, y) && Math.abs(x - 6 - y * 0.15) < 1.5 && y < 60, [255, 255, 255, 70]);
  img.fill((x, y) => rightGlass(x, y) && Math.abs(x - 358 + y * 0.15) < 1.5 && y < 60, [255, 255, 255, 70]);
  return img;
}

export function whiteboard() {
  const img = new Pixels(86, 46);
  img.rect(0, 0, 86, 40, P.metal[3]);
  img.rect(2, 2, 82, 36, "#fdfcf9");
  img.rect(2, 2, 82, 2, "#ffffff");
  // Marker sketches: a title, a little flow, a rising chart and a paw doodle.
  img.rect(6, 6, 30, 2, P.orange[2]);
  for (const [x, y] of [[6, 13], [26, 13], [46, 13]]) { img.rect(x, y, 14, 9, "#c9d6e8"); img.rect(x + 1, y + 1, 12, 7, "#fdfcf9"); img.rect(x + 3, y + 3, 7, 1, "#6b7fa8"); img.rect(x + 3, y + 5, 5, 1, "#6b7fa8"); }
  for (const x of [20, 40]) { img.rect(x + 1, 17, 4, 1, "#3a2b33"); img.set(x + 4, 16, "#3a2b33"); img.set(x + 4, 18, "#3a2b33"); }
  img.rect(6, 34, 34, 1, "#6b7fa8"); img.rect(6, 26, 1, 8, "#6b7fa8");
  [[9, 5], [14, 3], [19, 6], [24, 4]].forEach(([x, h]) => img.rect(x, 34 - h, 3, h, P.orange[2]));
  img.line(9, 31, 26, 26, "#c9493a");
  img.ellipse(72, 30, 4, 3.5, "#3a2b33"); img.ellipse(72, 30, 2.5, 2, "#fdfcf9");
  for (const [x, y] of [[67, 25], [70, 23], [74, 23], [77, 25]]) img.set(x, y, "#3a2b33");
  // Sticky notes.
  for (const [x, y, c] of [[64, 6, "#ffd56b"], [74, 7, "#ff9a57"], [66, 14, "#ffb3c9"]]) { img.rect(x, y, 8, 7, c); img.rect(x, y + 6, 8, 1, [0, 0, 0, 30]); }
  img.rect(10, 40, 66, 3, P.metal[2]);
  for (const [x, c] of [[16, "#c9493a"], [22, "#4c6aa6"], [28, P.orange[2]]]) img.rect(x, 39, 5, 2, c);
  img.outline(P.OUTLINE);
  return img;
}

// Wall screen with three slides that cycle like a presentation.
export function monitor() {
  const frames = [0, 1, 2].map(slide => {
    const img = new Pixels(92, 56);
    img.rect(0, 0, 92, 52, "#22212a"); img.rect(1, 1, 90, 1, "#3b3a46");
    img.rect(4, 4, 84, 44, "#f6f3ee");
    img.rect(4, 4, 84, 7, P.orange[2]);
    img.rect(7, 6, 26, 3, "#fff3e6");
    if (slide === 0) {
      [[12, 10], [24, 16], [36, 22], [48, 27], [60, 31]].forEach(([x, h], i) => { img.rect(x, 44 - h, 8, h, i === 4 ? P.orange[2] : "#b9c2cf"); img.rect(x, 44 - h, 8, 1, "#ffffff"); });
      img.rect(10, 44, 64, 1, "#6c6874");
      img.line(14, 30, 64, 12, "#c9493a");
    } else if (slide === 1) {
      img.fill(inEllipse(28, 29, 14, 14), (x, y) => (Math.atan2(y - 29, x - 28) < 0.9 && Math.atan2(y - 29, x - 28) > -1.6 ? P.orange[2] : y > 29 ? "#b9c2cf" : "#3a2b33"));
      img.ellipse(28, 29, 6, 6, "#f6f3ee");
      for (const [y, w, c] of [[20, 30, P.orange[2]], [27, 22, "#3a2b33"], [34, 26, "#b9c2cf"]]) { img.rect(50, y, 4, 4, c); img.rect(57, y + 1, w, 2, "#8a8494"); }
    } else {
      img.ellipse(46, 32, 9, 7.5, P.orange[2]);
      for (const [x, y] of [[33, 21], [41, 16], [51, 16], [59, 21]]) img.ellipse(x, y, 3.5, 4, P.orange[2]);
      img.rect(30, 42, 32, 2, "#8a8494");
    }
    img.fill((x, y) => x >= 4 && x < 88 && y >= 4 && y < 48 && x - y * 0.6 > 56 && x - y * 0.6 < 62, [255, 255, 255, 50]);
    img.rect(42, 52, 8, 4, P.metal[1]);
    img.outline(P.OUTLINE);
    return img;
  });
  return sheet(frames);
}

// Cool screen light washing the wall behind the monitor.
export function monitorGlow() {
  const img = new Pixels(130, 84);
  const alpha = [0, 18, 30, 44];
  img.fill(() => true, (x, y) => {
    const d = Math.hypot((x + 0.5 - 65) / 62, (y + 0.5 - 42) / 40);
    const level = d < 0.5 ? 3 : d < 0.75 ? 2 : d < 1 ? 1 : 0;
    return level ? [210, 225, 255, alpha[level]] : null;
  });
  return img;
}

// Flying-saucer pendant over the table.
export function saucerLamp() {
  const img = new Pixels(76, 34);
  img.rect(18, 0, 1, 20, P.metal[1]); img.rect(57, 0, 1, 20, P.metal[1]);
  img.ball(38, 22, 34, 6, P.orange);
  img.ellipse(38, 24, 30, 3, "#fff6df");
  img.ball(38, 17, 10, 4, P.shell);
  img.outline(P.OUTLINE);
  return img;
}

export function saucerGlow() {
  const img = new Pixels(200, 70);
  const alpha = [0, 22, 36, 52];
  img.fill(() => true, (x, y) => {
    const d = Math.hypot((x + 0.5 - 100) / 98, (y + 0.5 - 30) / 34);
    const level = d < 0.45 ? 3 : d < 0.72 ? 2 : d < 1 ? 1 : 0;
    return level ? [255, 214, 150, alpha[level]] : null;
  });
  return img;
}

// Orange racetrack table on two white tulip pedestals.
export function ovalTable() {
  const img = new Pixels(180, 70);
  const cx = 90;
  for (const px of [56, 124]) {
    img.shade((x, y) => y >= 38 && y < 60 && Math.abs(x + 0.5 - px) < 2.5 + ((y - 38) / 22) ** 2 * 6, x => [(x + 0.5 - px) / 8, 0, 0.9], P.shell);
    img.ball(px, 61, 13, 3.5, P.shell);
  }
  img.ellipse(cx, 26, 79, 20, P.orange[0]);
  img.ellipse(cx, 25, 79, 20, P.orange[1]);
  img.ball(cx, 22, 78, 20, [P.orange[1], P.orange[2], P.orange[3], P.orange[4]], { bias: 0.08 });
  img.fill(inEllipse(cx - 20, 15, 34, 4), [255, 255, 255, 70]);
  img.outline(P.OUTLINE);
  for (const px of [56, 124]) onlyEmpty(img, inEllipse(px, 64, 18, 3.5), [70, 30, 12, 80]);
  return img;
}

// Mugs, a notebook and a centerpiece, kept to the front half so they never cover a paw.
export function tableItems() {
  const img = new Pixels(180, 70);
  const mug = (x, y, c) => { img.rect(x, y, 6, 6, c); img.rect(x, y, 6, 1, "#5a3a2a"); img.rect(x + 6, y + 2, 2, 2, c); };
  mug(40, 24, P.shell[3]); mug(132, 26, P.shell[3]); mug(98, 32, "#3a2b33");
  img.rect(60, 30, 16, 9, "#fbf9f4"); img.rect(60, 30, 16, 1, "#ffffff"); for (let y = 32; y < 38; y += 2) img.rect(62, y, 11, 1, "#b8b2bd");
  img.rect(110, 28, 14, 10, "#3f4a63"); img.rect(111, 29, 12, 8, "#55617d"); img.rect(113, 31, 6, 1, "#fbf9f4");
  img.shade((x, y) => y >= 22 && y < 30 && Math.abs(x + 0.5 - 90) < 5 - (y - 22) * 0.25, x => [(x + 0.5 - 90) / 5, 0, 0.8], P.shell);
  for (const [dx, dy, r] of [[-3, 18, 3], [3, 17, 3], [0, 14, 3.5]]) img.ball(90 + dx, dy, r, r, P.leaf.slice(1));
  img.outline(P.OUTLINE);
  for (const [x, y] of [[43, 21], [44, 19], [135, 23], [136, 21]]) img.set(x, y, [255, 255, 255, 120]);
  return img;
}

// Tulip armchair back seen from the front; the table hides its lower half.
export function armchairBack() {
  const img = new Pixels(38, 34);
  img.ball(19, 18, 18, 16, P.shell);
  img.fill(inEllipse(19, 20, 13.5, 13), (x, y) => tone(P.orange, 0.25 + (y - 6) / 50, x, y, 1.1));
  img.outline(P.OUTLINE);
  return img;
}

// Front glass: corner posts, a frosted band and faint reflections over the whole scene.
export function frontGlass() {
  const { width, height } = STAGE;
  const img = new Pixels(width, height);
  img.fill((x, y) => y >= 168 && y < 175, (x, y) => ((x + y) % 4 === 0 ? [255, 255, 255, 120] : [255, 255, 255, 40]));
  img.rect(0, 166, width, 1, [255, 255, 255, 140]); img.rect(0, 175, width, 1, [255, 255, 255, 110]);
  for (const [x0, w] of [[24, 6], [34, 2], [300, 5]]) img.fill((x, y) => x - (height - y) * 0.6 >= x0 && x - (height - y) * 0.6 < x0 + w && y > 100, [255, 255, 255, 22]);
  img.rect(0, 0, 3, height, P.metal[3]); img.rect(width - 3, 0, 3, height, P.metal[3]);
  img.rect(2, 0, 1, height, P.metal[1]); img.rect(width - 3, 0, 1, height, P.metal[1]);
  return img;
}

