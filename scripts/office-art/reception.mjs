// Reception: glass entrance on the left, logo counter in the middle, waiting egg chair and a doorway to the lounge.
import { Pixels, bayer, ellipseNormal, inEllipse, random } from "./lib/pixel.mjs";
import { leafShape, onlyEmpty, roundedRect, tone } from "./president-room.mjs";
import { kanji, pawEmblem, roomShell, sideDoorway, text } from "./room-shell.mjs";
import * as P from "./palette.mjs";
import { outdoorView } from "./daylight.mjs";

const H = 78;

export function backdrop() {
  const { img, leftWall } = roomShell({ horizon: H });
  // Vertical slat panel behind the counter, a 70s wall treatment.
  const panel = roundedRect(104, 4, 264, H - 4, 10);
  img.fill(panel, (x, y) => tone(["#e6d9ca", "#eee3d6", "#f6ede3"], 0.75 - (y / 200) - Math.abs(x - 184) / 400, x, y));
  img.fill((x, y) => panel(x, y) && (x - 104) % 8 === 0, [150, 120, 100, 34]);
  img.fill((x, y) => panel(x, y) && (x - 104) % 8 === 1, [255, 255, 255, 60]);
  img.fill((x, y) => panel(x, y) && (!panel(x - 1, y) || !panel(x + 1, y) || !panel(x, y - 1)), "#cdbcab");
  // Orange band across the wall, broken by the panel.
  for (const [x0, x1] of [[19, 103], [265, 349]]) { img.rect(x0, 53, x1 - x0, 3, P.orange[2]); img.rect(x0, 53, x1 - x0, 1, P.orange[3]); img.rect(x0, 56, x1 - x0, 1, P.orange[0]); }

  // Glass sliding entrance in the left wall: the lawn park and the sky outside, under a pale glass tint.
  const door = (x, y) => leftWall(x, y) && x >= 2 && x <= 15 && y >= 10 + (15 - x) * 0.3;
  outdoorView(img, door, { top: 10, horizon: 46, bottom: 96, clouds: [[8, 22, 8, 3]], trees: [[10, 60, 4, 2]], seed: 51 });
  img.fill(door, [232, 244, 248, 70]);
  img.fill((x, y) => door(x, y) && Math.abs(x - 8.5) < 0.6, P.metal[2]);
  img.fill((x, y) => door(x, y) && (!door(x - 1, y) || !door(x + 1, y) || !door(x, y - 1)), P.metal[3]);
  img.fill((x, y) => door(x, y) && Math.abs(x - 4 - (y - 20) * 0.1) < 0.8 && y < 60, [255, 255, 255, 120]);
  // Daylight spilling in across the floor.
  img.fill((x, y) => y > H + 14 && y < 176 && x > 0 && x < 70 - (176 - y) * 0.3 && x > (176 - y) * 0.05, (x, y) => (bayer(x, y) < 0.35 ? [255, 255, 245, 40] : null));

  // Doorway to the lounge in the right wall, warm orange light beyond.
  sideDoorway(img, "right", { x0: 353, x1: 366, top: 24, glow: ["#d96a2a", "#ee7f35", "#f79a4c", "#ffb366"] });
  text(img, "LOUNGE >", 292, 22, P.orange[1]);
  img.rect(290, 29, 47, 1, P.orange[3]);

  // Welcome mat.
  const mat = roundedRect(36, 152, 90, 170, 6);
  img.fill(mat, (x, y) => tone(P.rugOrange, 0.5 - (y - 152) / 40, x, y, 1.2));
  img.fill((x, y) => mat(x, y) && (!mat(x - 2, y) || !mat(x + 2, y) || !mat(x, y - 2) || !mat(x, y + 2)), P.orange[0]);
  text(img, "WELCOME", 43, 158, "#fff1df");
  return img;
}

// Wall sign: paw emblem, 猫脳社 and NEKONOSHA.
export function logoSign() {
  const img = new Pixels(100, 40);
  const plate = roundedRect(0, 0, 100, 38, 8);
  img.fill(plate, (x, y) => tone(P.shell, 0.95 - y / 90 - x / 500, x, y));
  img.fill((x, y) => plate(x, y) && y >= 33, P.shell[1]);
  pawEmblem(img, 19, 18, 13);
  kanji(img, "猫脳社", 38, 7, P.OUTLINE);
  text(img, "NEKONOSHA", 38, 25, P.orange[1], { gap: 1 });
  img.outline(P.OUTLINE);
  onlyEmpty(img, (x, y) => y === 39 && x > 3 && x < 97, [90, 60, 50, 50]);
  return img;
}

// Curved space-age counter. The receptionist stands behind it, so the whole sprite sits in front of them.
export function counter() {
  const img = new Pixels(144, 54);
  const front = roundedRect(0, 8, 144, 50, 9);
  img.shade(front, x => [(x + 0.5 - 72) / 90, 0.2, 0.9], P.shell, { bias: -0.04 });
  for (const [y0, h] of [[20, 4], [26, 1]]) img.fill((x, y) => front(x, y) && y >= y0 && y < y0 + h, (x, y) => tone(P.orange, h > 1 ? 0.75 - (x / 400) : 0.3, x, y));
  img.fill((x, y) => front(x, y) && y >= 44, (x, y) => tone(P.shell, 0.15, x, y));
  // Logo medallion on the front.
  img.ellipse(72, 28, 12, 12, P.shell[4]);
  pawEmblem(img, 72, 28, 10);
  // Top surface, catching the pendant light.
  const top = roundedRect(2, 0, 142, 12, 6);
  img.fill(top, (x, y) => tone(["#e2dcd4", "#efeae3", "#f8f5ef", "#fffdf9"], 0.55 + y / 30 - Math.abs(x - 60) / 300, x, y));
  img.rect(4, 11, 136, 1, P.shell[1]);
  img.fill(inEllipse(44, 4, 26, 2), [255, 255, 255, 120]);
  img.outline(P.OUTLINE);
  onlyEmpty(img, inEllipse(72, 52, 74, 2.5), [70, 40, 25, 80]);
  return img;
}

// Things on the counter top: the back of an egg-shaped terminal, a visitor book, a bell and a flower vase.
export function counterItems() {
  const img = new Pixels(144, 30);
  img.shade((x, y) => ((x + 0.5 - 22) / 11) ** 2 + ((y + 0.5 - 12) / 10) ** 2 <= 1 && y < 20, ellipseNormal(22, 12, 11, 10), P.shell);
  for (const y of [8, 10, 12]) img.rect(17, y, 10, 1, P.shell[1]);
  img.rect(19, 20, 6, 3, P.shell[2]); img.rect(15, 23, 14, 2, P.shell[1]);
  img.rect(50, 21, 18, 5, "#fbf9f4"); img.rect(58, 21, 1, 5, "#cfc8bf"); img.rect(52, 22, 4, 1, "#b8b2bd"); img.rect(60, 22, 5, 1, "#b8b2bd"); img.rect(52, 24, 3, 1, "#b8b2bd");
  img.rect(66, 24, 1, 3, P.orange[2]);
  img.ball(104, 22, 4, 3.5, ["#c98d1f", "#e3a92f", "#f2c14a", "#fff0a8"]); img.rect(100, 24, 9, 2, "#8a6a2a"); img.rect(104, 17, 1, 2, "#c98d1f");
  img.shade((x, y) => y >= 15 && y < 26 && Math.abs(x + 0.5 - 124) < 3.5 - (y - 15) * 0.05 + (y > 21 ? 1 : 0), x => [(x + 0.5 - 124) / 4, 0, 0.8], P.orange);
  const rand = random(8);
  for (const [a, l] of [[-2.1, 9], [-1.6, 12], [-1.1, 9], [-2.5, 6]]) leafShape(img, 124, 15, a, l, 2, rand);
  for (const [x, y] of [[120, 4], [127, 3], [124, 1]]) img.ball(x, y, 2.2, 2.2, ["#e3628f", "#ff95bb", "#ffd0e0"]);
  img.outline(P.OUTLINE);
  return img;
}

// Arc floor lamp reaching over the waiting chair.
export function arcLamp() {
  const img = new Pixels(64, 112);
  img.ball(52, 106, 10, 3.5, P.metal);
  img.rect(51, 40, 3, 64, P.metal[3]); img.rect(53, 40, 1, 64, P.metal[1]);
  for (let t = 0; t <= 1; t += 0.01) {
    const a = Math.PI * t, x = 32 + Math.cos(a) * 20, y = 40 - Math.sin(a) * 34;
    img.rect(Math.round(x), Math.round(y), 2, 2, P.metal[3]);
  }
  img.outline(P.OUTLINE);
  const shade = (x, y) => inEllipse(12, 46, 11, 10)(x, y) && y < 48;
  img.shade(shade, ellipseNormal(12, 46, 11, 10), P.orange);
  img.rect(2, 47, 21, 2, "#fff4e0");
  img.fill((x, y) => inEllipse(12, 46, 12, 11)(x, y) && !img.opaque(x, y) && y < 50, P.OUTLINE);
  return img;
}
