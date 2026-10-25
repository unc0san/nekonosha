// Work-studio staff. Same proportions as the president-room cats, but coats are data so new staff are cheap to add.
import { Pixels, ellipseNormal, inEllipse, sheet } from "./lib/pixel.mjs";
import { capsule, tailFrames } from "./president-room.mjs";
import * as P from "./palette.mjs";

const noise = (u, v) => Math.sin(u * 7.3 + v * 3.1) + Math.sin(u * 2.9 - v * 6.4) + Math.sin((u + v) * 5.2);

const calicoOrange = ["#c4622a", "#de7a38", "#f09a52", "#f7b676"];
const calicoBlack = ["#24222a", "#33313a", "#45434d", "#57555f"];

// u/v are -1..1 inside the head or body ellipse, so one pattern works for sitting and walking poses.
export const STAFF = {
  kohaku: {
    fur: ["#2b211f", "#3a2c28", "#4c3933", "#5f4840"],
    patches: [{ ramp: ["#8f4421", "#ad582a", "#c8723a", "#dd9050"], test: (u, v) => noise(u * 1.3, v * 1.3) > 0.8 }],
    iris: "#e8b24c", whisker: [220, 200, 190, 150], accessory: "glasses",
  },
  mitsumame: {
    fur: ["#d8d1cb", "#ece6e0", "#f8f5f0", "#ffffff"],
    patches: [
      { ramp: calicoOrange, test: (u, v, part) => (part === "body" ? (u + 0.45) ** 2 + (v + 0.25) ** 2 < 0.3 : u < -0.1 && v < 0.05 && Math.abs(u) > (v + 1) * 0.12) },
      { ramp: calicoBlack, test: (u, v, part) => (part === "body" ? (u - 0.5) ** 2 + (v - 0.45) ** 2 < 0.2 : u > 0.35 && v < -0.15) },
    ],
    tail: calicoOrange, tailStripe: calicoBlack[1],
  },
  mugi: {
    fur: ["#5b4a3b", "#76624d", "#937c63", "#ae977c"],
    muzzle: ["#c4b195", "#d8c8ae", "#e9dcc7"], chest: ["#c4b195", "#d8c8ae", "#e9dcc7"],
    stripes: "#3a2f26", tailStripe: "#3a2f26", iris: "#9cc45e", accessory: "scarf",
  },
  kurogoma: {
    fur: ["#141318", "#1e1d24", "#2a2831", "#393743"],
    iris: "#f2cf4a", whisker: [200, 200, 210, 140], earInner: ["#7a4a5a", "#6a3f4e"], accessory: "headset",
  },
  omochi: {
    fur: ["#d4cfcb", "#e9e5e1", "#f7f5f2", "#ffffff"],
    iris: "#6aa8e8", accessory: "collar",
  },
};

function coatRamp(coat, part, u, v) {
  const patch = coat.patches?.find(p => p.test(u, v, part));
  if (patch) return patch.ramp;
  if (part === "head" && coat.muzzle && (u / 0.6) ** 2 + ((v - 0.5) / 0.4) ** 2 <= 1) return coat.muzzle;
  if (part === "body" && coat.chest && (u / 0.55) ** 2 + ((v + 0.1) / 0.75) ** 2 <= 1) return coat.chest;
  return coat.fur;
}

function stripeAt(coat, part, u, v) {
  if (!coat.stripes) return false;
  if (part === "head") return (v < -0.45 && [-0.28, 0, 0.28].some(s => Math.abs(u - s) < 0.05)) || (Math.abs(u) > 0.75 && [0.05, 0.25].some(s => Math.abs(v - s) < 0.06));
  return (u / 0.55) ** 2 + ((v + 0.1) / 0.75) ** 2 > 1 && (v * 3 + Math.abs(u) * 1.2 + 10) % 1 < 0.2;
}

function shadePart(img, coat, part, cx, cy, rx, ry, inside) {
  const toUV = (x, y) => [(x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry];
  img.shade(inside, ellipseNormal(cx, cy, rx, ry + 1), (x, y) => coatRamp(coat, part, ...toUV(x, y)));
  if (coat.stripes) img.fill((x, y) => inside(x, y) && stripeAt(coat, part, ...toUV(x, y)), coat.stripes);
}

// Head shapes and anything that should share the chunky outline. `ox` shifts the head sideways for the walk pose.
function drawHead(img, coat, ox, hy) {
  const hx = 17 + ox;
  const inside = (x, y) => inEllipse(hx, hy, 12.5, 10)(x, y) || inEllipse(hx, hy + 4, 14, 6.5)(x, y);
  shadePart(img, coat, "head", hx, hy + 1, 14, 10.5, inside);
  img.polygon([[5 + ox, hy - 3], [7 + ox, hy - 14], [15 + ox, hy - 8]], coatRamp(coat, "head", -0.65, -1)[2]);
  img.polygon([[19 + ox, hy - 8], [28 + ox, hy - 14], [30 + ox, hy - 3]], coatRamp(coat, "head", 0.65, -1)[1]);
  const inner = coat.earInner ?? ["#f2a3b0", "#e48d9c"];
  img.polygon([[7 + ox, hy - 5], [8 + ox, hy - 11], [12 + ox, hy - 8]], inner[0]); img.polygon([[22 + ox, hy - 8], [27 + ox, hy - 11], [28 + ox, hy - 5]], inner[1]);

  if (coat.accessory === "scarf") {
    img.rect(8 + ox, hy + 10, 20, 2, P.orange[2]); img.rect(8 + ox, hy + 11, 20, 1, P.orange[1]);
    img.polygon([[15 + ox, hy + 11], [22 + ox, hy + 11], [18.5 + ox, hy + 17]], P.orange[3]);
  }
  if (coat.accessory === "collar") {
    const r = P.cats.ponzu.ribbon;
    img.rect(8 + ox, hy + 10, 20, 2, r[1]); img.rect(8 + ox, hy + 11, 20, 1, r[0]);
    img.ball(18 + ox, hy + 13, 1.8, 1.8, ["#c98d1f", "#f2c14a", "#fff0a8"]);
  }
  if (coat.accessory === "headset") {
    for (let a = 196; a <= 300; a += 3) {
      const t = (a * Math.PI) / 180;
      img.set(Math.round(hx + Math.cos(t) * 13.5), Math.round(hy - 2 + Math.sin(t) * 11), P.metal[2]);
    }
    img.ball(3 + ox, hy + 1, 2.8, 3.8, P.orange);
  }
}

function drawFace(img, coat, ox, hy, closed, { mouthOpen = false, lookDown = false } = {}) {
  const eye = "#2b2129";
  for (const ex of [10 + ox, 22 + ox]) {
    if (closed) { img.rect(ex, hy + 1, 4, 1, eye); img.set(ex - 1, hy, eye); img.set(ex + 4, hy, eye); continue; }
    // Reading: lids half down, gaze on the papers.
    if (lookDown) { img.rect(ex, hy, 3, 2, eye); img.rect(ex - 1, hy - 1, 5, 1, eye); if (coat.iris) img.set(ex + 1, hy + 1, coat.iris); continue; }
    img.rect(ex, hy - 2, 3, 4, eye); img.set(ex + 1, hy - 3, eye); img.set(ex + 1, hy + 2, eye);
    if (coat.iris) for (const [x, y] of [[ex, hy - 1], [ex, hy], [ex + 2, hy - 1], [ex + 2, hy]]) img.set(x, y, coat.iris);
    img.set(ex, hy - 2, "#ffffff"); img.set(ex + 2, hy + 1, [255, 255, 255, 170]);
  }
  img.rect(16 + ox, hy + 3, 2, 1, "#ec7f95");
  const mouth = coat.whisker ? [190, 170, 180] : P.OUTLINE;
  img.set(16 + ox, hy + 4, mouth); img.set(17 + ox, hy + 4, mouth); img.set(15 + ox, hy + 5, mouth); img.set(18 + ox, hy + 5, mouth);
  if (mouthOpen) { img.rect(16 + ox, hy + 5, 2, 2, "#5a2a35"); img.set(16 + ox, hy + 6, "#ec7f95"); }
  for (const bx of [7 + ox, 25 + ox]) img.rect(bx, hy + 3, 3, 1, [255, 140, 160, 150]);
  const whisker = coat.whisker ?? [90, 70, 80, 150];
  for (const [x0, x1, y] of [[-1, 3, hy + 2], [-1, 3, hy + 5], [31, 35, hy + 2], [31, 35, hy + 5]]) img.line(x0 + 1 + ox, y, x1 + ox, y + (y > hy + 3 ? 1 : 0), whisker);

  if (coat.accessory === "glasses") {
    const frame = "#f3c45a";
    for (const ex of [10 + ox, 22 + ox]) {
      img.fill((x, y) => x >= ex - 1 && x <= ex + 3 && y >= hy - 4 && y <= hy + 2 && (x === ex - 1 || x === ex + 3 || y === hy - 4 || y === hy + 2), frame);
      img.fill((x, y) => x > ex - 1 && x < ex + 3 && y > hy - 4 && y < hy + 2, [255, 255, 255, 36]);
    }
    img.rect(14 + ox, hy - 2, 7, 1, frame);
  }
  if (coat.accessory === "headset") {
    img.line(4 + ox, hy + 4, 9 + ox, hy + 7, P.metal[2]);
    img.set(10 + ox, hy + 7, P.orange[3]);
  }
}

// Sitting pose, identical framing to the president-room cats (42×50, torso centered at 18,38).
function seatedFrame(coat, { pose, frame, blink = false }) {
  const img = new Pixels(42, 50);
  const resting = pose === "rest";
  const hy = 15 + (resting ? frame : 0);
  shadePart(img, coat, "body", 18, 38, 11, 11.5, inEllipse(18, 38, 11, 11.5));
  // Neck fills the pinch between the round head and body.
  img.shade(inEllipse(18, 27, 8, 3), ellipseNormal(18, 27, 8, 3), coat.fur);
  const pawUp = resting ? [0, 0] : frame === 0 ? [-1, 0] : [0, -1];
  const arms = resting ? [[16, 33, 13, 42], [20, 33, 23, 42]] : [[22, 31, 31, 33 + pawUp[0]], [23, 35, 33, 38 + pawUp[1]]];
  for (const [ax, ay, bx, by] of arms) {
    const arm = capsule(ax, ay, bx, by, 3.2);
    img.shade(arm.inside, arm.normal, coat.fur);
    img.ball(bx + (resting ? 0 : 1.5), by + (resting ? 1.5 : 0), 3.2, 2.6, coat.fur.slice(1));
  }
  drawHead(img, coat, 0, hy);
  img.outline(P.OUTLINE);
  drawFace(img, coat, 0, hy, resting || blink);
  return img;
}

export const seatedSheet = (name, pose) => sheet([0, 1].map(frame => seatedFrame(STAFF[name], { pose, frame })));

export const seatedBlink = name => seatedFrame(STAFF[name], { pose: "type", frame: 0, blink: true })
  .mask((x, y) => y >= 10 && y <= 18 && ((x >= 8 && x <= 14) || (x >= 20 && x <= 26)));

export const staffTail = (name, torso) => tailFrames(STAFF[name].tail ?? STAFF[name].fur, torso, STAFF[name].tailStripe);

// Side-on walk cycle facing right (44×42, feet at y≈40). Four frames: contact, pass, contact, pass.
function walkFrame(coat, frame) {
  const img = new Pixels(44, 42);
  const swing = [2, 0, -2, 0][frame];
  const hy = 15 + (frame % 2);
  const tailRamp = coat.tail ?? coat.fur;
  const curve = [[7, 28], [0, 25], [-1, 15], [3 + (frame % 2), 11]];
  for (let i = 0; i < 12; i++) {
    const t = i / 11, u = 1 - t;
    const [x, y] = [0, 1].map(k => u ** 3 * curve[0][k] + 3 * u * u * t * curve[1][k] + 3 * u * t * t * curve[2][k] + t ** 3 * curve[3][k]);
    img.ball(x + 1, y, 2.4 - i * 0.05, 2.4 - i * 0.05, tailRamp);
  }
  const leg = (x, s, ramp) => {
    const limb = capsule(x, 31, x + s, 37, 2.2);
    img.shade(limb.inside, limb.normal, ramp);
    img.ball(x + s, 38, 2.4, 1.6, coat.fur.slice(1));
  };
  const far = [coat.fur[0], coat.fur[0], coat.fur[1]];
  leg(23, -swing, far); leg(8, swing, far);
  shadePart(img, coat, "body", 16, 29, 12, 6.5, inEllipse(16, 29, 12, 6.5));
  leg(26, swing, coat.fur); leg(11, -swing, coat.fur);
  drawHead(img, coat, 9, hy);
  img.outline(P.OUTLINE);
  drawFace(img, coat, 9, hy, false);
  return img;
}

export const walkSheet = name => sheet([0, 1, 2, 3].map(frame => walkFrame(STAFF[name], frame)));

// ---------- Meeting poses ----------
// Poses: "speak" (paw gestures, mouth moves), "nod" (head bobs, eyes shut), "read" (looking down at papers).

function papers(img, x0, y0, w, h, flip) {
  img.rect(x0, y0, w, h, "#fbf9f4");
  img.rect(x0, y0 + h - 1, w, 1, "#d9d3ca");
  for (let y = y0 + 2; y < y0 + h - 2; y += 2) img.rect(x0 + 2, y, w - 4 - ((y / 2) % 3), 1, "#b8b2bd");
  img.rect(x0 + 2, y0 + 1, 4, 1, P.orange[2]);
  // Second frame lifts the corner as if turning the page.
  if (flip) img.polygon([[x0 + w - 4, y0], [x0 + w, y0], [x0 + w, y0 + 4]], "#e7e1d8");
}

const armTo = (img, coat, ax, ay, bx, by) => {
  const arm = capsule(ax, ay, bx, by, 3.2);
  img.shade(arm.inside, arm.normal, coat.fur);
  img.ball(bx, by, 3.2, 2.6, coat.fur.slice(1));
};

// Facing the viewer from behind the table. Everything below y=40 is cut flat so it meets the table edge.
function meetingFrontFrame(coat, pose, frame) {
  const img = new Pixels(42, 46);
  const hy = 15 + (pose === "nod" && frame === 1 ? 2 : 0) + (pose === "read" ? 1 : 0);
  shadePart(img, coat, "body", 21, 38, 12, 10, inEllipse(21, 38, 12, 10));
  img.shade(inEllipse(21, 27, 8, 3), ellipseNormal(21, 27, 8, 3), coat.fur);
  const torso = img.mask((x, y) => y <= 40);
  const out = new Pixels(42, 46).blit(torso, 0, 0);
  if (pose === "read") papers(out, 13, 37, 17, 8, frame === 1);
  if (pose === "speak") { armTo(out, coat, 12, 33, 12, 42); armTo(out, coat, 30, 31, frame ? 35 : 33, frame ? 24 : 28); }
  else { armTo(out, coat, 12, 33, 13, 42); armTo(out, coat, 30, 33, 29, 42); }
  drawHead(out, coat, 4, hy);
  out.outline(P.OUTLINE);
  drawFace(out, coat, 4, hy, pose === "nod" && frame === 1, { mouthOpen: pose === "speak" && frame === 1, lookDown: pose === "read" });
  return out;
}

// Side-on at the table ends, same framing as the desk pose so chairs and tails line up.
function meetingSideFrame(coat, pose, frame) {
  const img = new Pixels(42, 50);
  const hy = 15 + (pose === "nod" && frame === 1 ? 2 : 0) + (pose === "read" ? 1 : 0);
  shadePart(img, coat, "body", 18, 38, 11, 11.5, inEllipse(18, 38, 11, 11.5));
  img.shade(inEllipse(18, 27, 8, 3), ellipseNormal(18, 27, 8, 3), coat.fur);
  if (pose === "read") { papers(img, 26, 30, 12, 9, frame === 1); armTo(img, coat, 22, 32, 27, 36); armTo(img, coat, 23, 35, 36, 38); }
  else if (pose === "speak") { armTo(img, coat, 22, 31, 31, 34); armTo(img, coat, 23, 33, frame ? 33 : 31, frame ? 22 : 26); }
  else { armTo(img, coat, 22, 31, 32, 34); armTo(img, coat, 23, 35, 34, 37); }
  drawHead(img, coat, 0, hy);
  img.outline(P.OUTLINE);
  drawFace(img, coat, 0, hy, pose === "nod" && frame === 1, { mouthOpen: pose === "speak" && frame === 1, lookDown: pose === "read" });
  return img;
}

export const meetingSheet = (name, view, pose) => sheet([0, 1].map(frame => (view === "front" ? meetingFrontFrame : meetingSideFrame)(STAFF[name], pose, frame)));
