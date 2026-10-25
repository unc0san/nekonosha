// Tiny pixel canvas used to author the office sprites as code.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { encodePng } from "./png.mjs";

export function rgba(color, alpha) {
  if (Array.isArray(color)) return alpha === undefined ? color : [color[0], color[1], color[2], alpha];
  const hex = color.replace("#", "");
  const value = parseInt(hex.slice(0, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6), 16) : 255;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha ?? a];
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Light comes from the chandelier: above, slightly left of the viewer.
const LIGHT = (() => { const l = [-0.45, -0.75, 0.5]; const n = Math.hypot(...l); return l.map(v => v / n); })();

export class Pixels {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return [0, 0, 0, 0];
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  opaque(x, y) { return this.get(x, y)[3] > 0; }

  // Alpha-composites the color so translucent glows and shadows blend.
  set(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const [r, g, b, a] = rgba(color);
    const i = (y * this.width + x) * 4;
    if (a === 255 || this.data[i + 3] === 0) { this.data.set([r, g, b, a], i); return; }
    const da = this.data[i + 3] / 255, sa = a / 255, oa = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) this.data[i + k] = ([r, g, b][k] * sa + this.data[i + k] * da * (1 - sa)) / oa;
    this.data[i + 3] = oa * 255;
  }

  clear(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data.fill(0, (y * this.width + x) * 4, (y * this.width + x) * 4 + 4);
  }

  fill(inside, color) {
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (!inside(x, y)) continue;
      const c = typeof color === "function" ? color(x, y) : color;
      if (c) this.set(x, y, c);
    }
    return this;
  }

  rect(x, y, w, h, color) { return this.fill((px, py) => px >= x && px < x + w && py >= y && py < y + h, color); }

  ellipse(cx, cy, rx, ry, color) { return this.fill(inEllipse(cx, cy, rx, ry), color); }

  // Fills a shape with a dark-to-light ramp from a fake surface normal (stepped, not smooth).
  shade(inside, normal, ramp, { bias = 0, dither = true } = {}) {
    return this.fill(inside, (x, y) => {
      const [nx, ny, nz] = normal(x, y);
      const lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + 1) / 2 + bias;
      const colors = typeof ramp === "function" ? ramp(x, y) : ramp;
      const level = Math.max(0, Math.min(colors.length - 1, lit * colors.length - (dither ? bayer(x, y) - 0.5 : 0) * 0.6));
      return colors[Math.floor(level)];
    });
  }

  ball(cx, cy, rx, ry, ramp, options) {
    return this.shade(inEllipse(cx, cy, rx, ry), ellipseNormal(cx, cy, rx, ry), ramp, options);
  }

  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) return this;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  polygon(points, color) { return this.fill(inPolygon(points), color); }

  // Adds the chunky outline that gives the reference art its sticker-like read.
  outline(color, { diagonal = false } = {}) {
    const marks = [];
    const near = diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (this.get(x, y)[3] > 0) continue;
      if (near.some(([dx, dy]) => this.get(x + dx, y + dy)[3] > 160)) marks.push([x, y]);
    }
    for (const [x, y] of marks) this.set(x, y, color);
    return this;
  }

  blit(source, dx, dy, { flip = false } = {}) {
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      const c = source.get(flip ? source.width - 1 - x : x, y);
      if (c[3]) this.set(dx + x, dy + y, c);
    }
    return this;
  }

  // Keeps only pixels that satisfy `keep`; used to split furniture into back and front layers.
  mask(keep) {
    const out = new Pixels(this.width, this.height);
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) if (keep(x, y)) out.set(x, y, this.get(x, y));
    return out;
  }

  flipped() { return new Pixels(this.width, this.height).blit(this, 0, 0, { flip: true }); }

  save(path) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, encodePng(this.width, this.height, this.data));
  }
}

export function sheet(frames) {
  const out = new Pixels(frames[0].width * frames.length, frames[0].height);
  frames.forEach((frame, i) => out.blit(frame, i * frame.width, 0));
  return out;
}

export function scaleUp(source, factor) {
  const out = new Pixels(source.width * factor, source.height * factor);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const c = source.get(Math.floor(x / factor), Math.floor(y / factor));
    if (c[3]) out.set(x, y, c);
  }
  return out;
}

export const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

export const ellipseNormal = (cx, cy, rx, ry) => (x, y) => {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
  return [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
};

export const inPolygon = points => (x, y) => {
  let inside = false;
  const px = x + 0.5, py = y + 0.5;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
