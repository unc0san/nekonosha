// Shared pieces for the reception and lounge: the same wall, floor and light as the other rooms, plus a tiny pixel font.
import { Pixels, inEllipse } from "./lib/pixel.mjs";
import { tone } from "./president-room.mjs";
import * as P from "./palette.mjs";

// Back wall, two angled side walls and the glossy floor with converging seams (same recipe as the work studio).
export function roomShell({ width = 368, height = 180, horizon = 78, left = 18, right = 350 } = {}) {
  const img = new Pixels(width, height);
  const onFloor = (x, y) => y >= horizon && y >= horizon + (left - x) * 1.1 && y >= horizon + (x - right) * 1.1;
  const leftWall = (x, y) => x < left && y < horizon + (left - x) * 1.1;
  const rightWall = (x, y) => x >= right && y < horizon + (x - right) * 1.1;
  img.fill((x, y) => y < horizon, (x, y) => tone(P.wall, 0.95 - Math.abs(x - width / 2) / 290 - (horizon - y) / 380, x, y));
  img.fill(leftWall, (x, y) => tone(P.sideWall, 0.55 + y / 400, x, y));
  img.fill(rightWall, (x, y) => tone(P.sideWall, 0.4 + y / 400, x, y));
  img.rect(left - 1, 0, 2, horizon, "#c2b4a8"); img.rect(right - 1, 0, 2, horizon, "#c2b4a8");

  img.fill(onFloor, (x, y) => tone(P.floor, 0.25 + (y - horizon) / 120, x, y, 0.7));
  const vanish = { x: width / 2, y: -70 };
  for (let fx = -200; fx <= width + 200; fx += 30) for (let y = horizon + 1; y < height; y++) {
    const x = Math.round(vanish.x + (fx - vanish.x) * (y - vanish.y) / (height - vanish.y));
    if (onFloor(x, y)) img.set(x, y, [150, 136, 124, 28]);
  }
  for (const y of [86, 100, 122, 152]) img.fill((x, py) => py === y && onFloor(x, py), [150, 136, 124, 26]);
  img.rect(left + 1, horizon, right - left - 1, 2, [120, 100, 90, 70]);
  img.rect(left + 1, horizon - 4, right - left - 1, 4, P.wall[0]); img.rect(left + 1, horizon - 4, right - left - 1, 1, "#c8baad");
  return { img, onFloor, leftWall, rightWall };
}

// A rounded doorway cut into a side wall, glowing with the next room's light.
export function sideDoorway(img, side, { x0, x1, top, horizon = 78, left = 18, right = 350, glow = P.orange }) {
  const floorAt = x => (side === "left" ? horizon + (left - x) * 1.1 : horizon + (x - right) * 1.1);
  const inside = (x, y) => x >= x0 && x <= x1 && y >= top + Math.max(0, 6 - Math.min(x - x0, x1 - x) * 2) && y < floorAt(x);
  img.fill(inside, (x, y) => tone([glow[0], glow[1], glow[2], glow[3]], 0.2 + (y - top) / 60, x, y, 1.4));
  img.fill((x, y) => inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1)), P.shell[3]);
  return inside;
}

// Circular emblem with a white paw: the 猫脳社 logo mark.
export function pawEmblem(img, cx, cy, r) {
  img.ball(cx, cy, r, r, P.orange, { bias: 0.08 });
  const s = r / 10;
  img.ellipse(cx, cy + 2.5 * s, 4.2 * s, 3.4 * s, "#fffaf2");
  for (const [dx, dy] of [[-5, -2.5], [-2, -5.5], [2, -5.5], [5, -2.5]]) img.ellipse(cx + dx * s, cy + dy * s, 1.7 * s, 2 * s, "#fffaf2");
}

const FONT = {
  A: ["01110", "10001", "11111", "10001", "10001"], C: ["01111", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "11110", "10000", "11111"], G: ["01111", "10000", "10011", "10001", "01111"],
  H: ["10001", "10001", "11111", "10001", "10001"], K: ["10001", "10010", "11100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "11111"], M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001"], O: ["01110", "10001", "10001", "10001", "01110"],
  S: ["01111", "10000", "01110", "00001", "11110"], U: ["10001", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10101", "11011", "10001"], R: ["11110", "10001", "11110", "10010", "10001"],
  P: ["11110", "10001", "11110", "10000", "10000"], I: ["01110", "00100", "00100", "00100", "01110"],
  T: ["11111", "00100", "00100", "00100", "00100"], D: ["11110", "10001", "10001", "10001", "11110"], ">": ["01000", "00100", "00010", "00100", "01000"],
  "<": ["00010", "00100", "01000", "00100", "00010"], " ": ["00000", "00000", "00000", "00000", "00000"],
};

// 12×12 glyphs for the company name.
const KANJI = {
  猫: ["...#..#..#..", "#.#.########", ".#....#..#..", ".#..........", "##..#######.", ".#..#..#..#.", "#.#.#..#..#.", "..#.#######.", "..#.#..#..#.", "..#.#..#..#.", "##..#######.", "............"],
  脳: ["......#.#.#.", ".###...#.#..", ".#.#........", ".###.#.....#", ".#.#.#.#.#.#", ".###.#..#..#", ".#.#.#.#.#.#", ".#.#.#.....#", "#..#.#######", "#.##........", "............", "............"],
  社: ["..#.........", "...#.....#..", "####.....#..", "...#.....#..", "..#..#######", ".##......#..", "#.##.....#..", "..#......#..", "..#......#..", "..#......#..", "..#.########", "............"],
};

export function text(img, string, x, y, color, { gap = 1 } = {}) {
  for (const ch of string) {
    FONT[ch].forEach((row, dy) => [...row].forEach((bit, dx) => { if (bit === "1") img.set(x + dx, y + dy, color); }));
    x += 5 + gap;
  }
}

export function kanji(img, string, x, y, color, { gap = 2 } = {}) {
  for (const ch of string) {
    KANJI[ch].forEach((row, dy) => [...row].forEach((bit, dx) => { if (bit === "#") img.set(x + dx, y + dy, color); }));
    x += 12 + gap;
  }
}

// Stepped warm halo, shared by every lamp in these rooms.
export function halo(width, height, { color = [255, 214, 150], alpha = [0, 22, 38, 56] } = {}) {
  const img = new Pixels(width, height);
  img.fill(() => true, (x, y) => {
    const d = Math.hypot((x + 0.5 - width / 2) / (width / 2), (y + 0.5 - height / 2) / (height / 2));
    const level = d < 0.45 ? 3 : d < 0.72 ? 2 : d < 1 ? 1 : 0;
    return level ? [...color, alpha[level]] : null;
  });
  return img;
}

export const ring = (cx, cy, r0, r1) => (x, y) => inEllipse(cx, cy, r1, r1)(x, y) && !inEllipse(cx, cy, r0, r0)(x, y);
