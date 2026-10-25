// Lounge: orange sofa, round table, coffee bar and porthole windows. Doorways lead to the reception (left) and studio (right).
import { Pixels, bayer, ellipseNormal, inEllipse, sheet } from "./lib/pixel.mjs";
import { onlyEmpty, roundedRect, tone } from "./president-room.mjs";
import { ring, roomShell, sideDoorway, text } from "./room-shell.mjs";
import * as P from "./palette.mjs";
import { outdoorView } from "./daylight.mjs";

const H = 78;
const PORTHOLES = [[146, 32], [234, 32]];
const LOUNGE_VIEW = {
  top: 13, horizon: 37, bottom: 51,
  clouds: [[138, 21, 12, 4], [244, 19, 14, 5]],
  benches: [[222, 41, 0.7]],
  trees: [[156, 44, 5, 3], [132, 41, 3, 8], [247, 43, 4, 5]],
  seed: 41,
};

export function backdrop() {
  const { img } = roomShell({ horizon: H });
  img.rect(19, 56, 330, 3, P.orange[2]); img.rect(19, 56, 330, 1, P.orange[3]); img.rect(19, 59, 330, 1, P.orange[0]);

  // Porthole windows onto the lawn park in front of the building (Fuji is behind the office, out of sight).
  const portholes = PORTHOLES.map(([cx, cy]) => inEllipse(cx, cy, 19, 19));
  outdoorView(img, (x, y) => portholes.some(g => g(x, y)), LOUNGE_VIEW);
  for (const [cx, cy] of PORTHOLES) {
    const glass = inEllipse(cx, cy, 19, 19);
    img.fill((x, y) => glass(x, y) && Math.abs(x - cx + 8 - (y - cy) * 0.6) < 1.5 && y < cy, [255, 255, 255, 40]);
    img.fill(ring(cx, cy, 19, 23), (x, y) => tone(P.shell, 0.85 - (y - cy) / 50, x, y));
    img.fill((x, y) => ring(cx, cy, 23, 24)(x, y), "#b7aaa0");
    for (const a of [0.4, 2.0, 3.6, 5.2]) img.ellipse(cx + Math.cos(a) * 21, cy + Math.sin(a) * 21, 1, 1, P.metal[2]);
  }

  // Sunburst clock between the windows.
  const [kx, ky] = [190, 30];
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) img.line(kx + Math.cos(a) * 9, ky + Math.sin(a) * 9, kx + Math.cos(a) * 15, ky + Math.sin(a) * 15, P.orange[a % (Math.PI / 4) < 0.1 ? 2 : 3]);
  img.ball(kx, ky, 8, 8, P.shell);
  img.fill(ring(kx, ky, 8, 9), P.orange[1]);
  img.line(kx, ky, kx, ky - 5, P.OUTLINE); img.line(kx, ky, kx + 4, ky + 1, P.OUTLINE);

  // Mug shelf above the coffee bar.
  img.rect(24, 36, 64, 3, P.shell[3]); img.rect(24, 39, 64, 1, P.shell[1]); img.rect(26, 40, 60, 2, [90, 60, 50, 40]);
  [[28, P.orange[2]], [38, P.shell[3]], [48, "#4c6aa6"], [58, P.orange[3]], [68, P.shell[3]], [78, "#6c9160"]].forEach(([x, c]) => {
    img.rect(x, 29, 6, 7, c); img.rect(x + 6, 31, 2, 3, c); img.clear(x + 6, 32); img.rect(x, 29, 6, 1, [255, 255, 255, 80]);
  });

  // Doorways: reception on the left, work studio on the right.
  sideDoorway(img, "left", { x0: 2, x1: 15, top: 24, glow: ["#d9cfc2", "#e6ddd1", "#f0e9df", "#fbf6ee"] });
  sideDoorway(img, "right", { x0: 353, x1: 366, top: 24, glow: ["#c9b9a8", "#d8cab9", "#e6dbcd", "#f3ebe0"] });
  text(img, "< RECEPTION", 22, 10, P.orange[1]);
  text(img, "STUDIO >", 302, 10, P.orange[1]);
  return img;
}

// Three-seat curved sofa. `back` sits behind the cats; `front` (arms and seat edge) covers their laps.
export function sofa() {
  const img = new Pixels(150, 62);
  const back = roundedRect(8, 6, 142, 40, 13);
  img.shade(back, (x, y) => [(x + 0.5 - 75) / 120, (y - 22) / 30, 0.85], P.orange);
  for (const sx of [55, 96]) img.fill((x, y) => back(x, y) && x === sx && y > 10 && y < 34, P.orange[0]);
  for (const sx of [34, 75, 116]) img.set(sx, 20, P.orange[0]);
  const seat = roundedRect(14, 32, 136, 44, 4);
  img.fill(seat, (x, y) => tone([P.orange[2], P.orange[3], P.orange[4]], 0.4 + (44 - y) / 20 - Math.abs(x - 60) / 300, x, y));
  for (const sx of [55, 96]) img.fill((x, y) => seat(x, y) && x === sx, P.orange[1]);
  const face = (x, y) => x >= 14 && x < 136 && y >= 42 && y < 52;
  img.fill(face, (x, y) => tone([P.orange[0], P.orange[1], P.orange[2]], 0.6 - (y - 42) / 16, x, y));
  img.rect(14, 42, 122, 1, P.orange[3]);
  for (const ax of [0, 130]) {
    const arm = roundedRect(ax, 18, ax + 20, 54, 8);
    img.shade(arm, ellipseNormal(ax + 10, 30, 12, 28), P.orange, { bias: ax ? -0.05 : 0.05 });
  }
  img.rect(6, 52, 138, 4, P.shell[3]); img.rect(6, 55, 138, 1, P.shell[1]);
  for (const lx of [16, 130]) { img.rect(lx, 56, 4, 4, P.metal[3]); img.rect(lx + 3, 56, 1, 4, P.metal[1]); }
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(75, 60, 72, 2.5), [70, 30, 12, 80]);
  const inFront = (x, y) => y >= 42 || x < 13 || x > 136;
  return { back: img.mask((x, y) => !inFront(x, y)), front: img.mask(inFront) };
}

// White cabinet with orange sliding doors; mugs and a cookie jar on top.
export function coffeeBar() {
  const img = new Pixels(80, 64);
  const body = roundedRect(2, 12, 78, 58, 6);
  img.shade(body, x => [(x + 0.5 - 40) / 70, 0.1, 0.9], P.shell);
  for (const dx of [7, 41]) {
    const door = roundedRect(dx, 20, dx + 32, 50, 5);
    img.fill(door, (x, y) => tone(P.orange, 0.65 - (y - 20) / 60 - (x - dx) / 200, x, y));
    img.ball(dx + (dx < 40 ? 28 : 4), 35, 2, 2, P.shell);
  }
  img.fill(roundedRect(0, 8, 80, 16, 4), (x, y) => tone(["#e2dcd4", "#efeae3", "#f8f5ef", "#fffdf9"], 0.6 + (y - 8) / 18, x, y));
  img.rect(2, 15, 76, 1, P.shell[1]);
  img.rect(4, 58, 72, 3, P.shell[1]);
  // Cookie jar and stacked cups to the right of the machine.
  img.shade((x, y) => inEllipse(58, 4, 7, 6)(x, y) && y > -1, ellipseNormal(58, 4, 7, 6), ["#c9dde4", "#d9e8ec", "#e8f2f3", "#ffffff"]);
  for (const [x, y] of [[55, 5], [59, 7], [61, 3]]) img.ellipse(x, y, 1.5, 1, "#c98a4a");
  img.rect(54, -1, 9, 2, P.orange[2]);
  for (const y of [2, 6]) { img.rect(68, y, 6, 4, P.shell[3]); img.rect(68, y + 3, 6, 1, P.shell[1]); }
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(40, 62, 40, 2.5), [70, 40, 25, 80]);
  return img;
}

// Retro espresso machine; a small red light blinks while it brews.
export function coffeeMachine() {
  const frames = [0, 1].map(frame => {
    const img = new Pixels(36, 36);
    img.shade(roundedRect(4, 4, 32, 32, 8), (x, y) => [(x + 0.5 - 18) / 20, (y - 14) / 30, 0.85], P.orange);
    img.ball(18, 5, 12, 4, P.metal);
    img.rect(8, 18, 20, 10, "#3a2b33"); img.rect(9, 19, 18, 1, "#55505c");
    img.rect(16, 18, 4, 3, P.metal[3]);
    img.rect(14, 23, 8, 5, P.shell[3]); img.rect(14, 23, 8, 1, "#6b3f28"); img.rect(22, 24, 2, 2, P.shell[2]);
    img.ball(10, 12, 2.5, 2.5, P.metal); img.ball(26, 12, 2.5, 2.5, P.metal);
    img.ellipse(18, 12, 1.5, 1.5, frame ? "#ff5a4a" : "#9c2f2a");
    img.rect(6, 31, 24, 3, P.metal[3]);
    img.outline(P.OUTLINE);
    return img;
  });
  return sheet(frames);
}

// Steam curls rising from the cup, three frames.
export function steam() {
  const frames = [0, 1, 2].map(frame => {
    const img = new Pixels(12, 16);
    for (let i = 0; i < 3; i++) {
      const y = 13 - ((i * 5 + frame * 2) % 14), x = 6 + Math.round(Math.sin((y + frame * 3) / 3) * 2);
      const alpha = 70 + y * 8;
      img.rect(x, y, 2, 2, [255, 255, 255, Math.min(200, alpha)]);
      if (bayer(x, y) < 0.5) img.set(x - 1, y + 1, [255, 255, 255, 90]);
    }
    return img;
  });
  return sheet(frames);
}

// Mugs and a plate of fish cookies, laid over the tulip table from the president's suite.
export function tableSnacks() {
  const img = new Pixels(68, 58);
  const mug = (x, y, c) => { img.rect(x, y, 6, 6, c); img.rect(x + 1, y, 4, 1, "#6b3f28"); img.rect(x + 6, y + 1, 2, 3, c); img.clear(x + 6, y + 2); };
  mug(12, 15, P.shell[3]); mug(48, 16, P.orange[2]);
  img.ellipse(24, 23, 6, 2, P.shell[3]); img.ellipse(24, 22.5, 4.5, 1.2, P.shell[2]);
  for (const x of [21, 25]) { img.ellipse(x, 21, 2, 1, "#d39a5a"); img.set(x + 2, 21, "#d39a5a"); }
  img.outline(P.OUTLINE);
  for (const [x, y] of [[13, 13], [14, 11], [50, 14], [49, 12]]) img.set(x, y, [255, 255, 255, 110]);
  return img;
}
