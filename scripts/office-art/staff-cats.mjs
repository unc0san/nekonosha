// Work-studio staff. Same proportions as the president-room cats, but coats are data so new staff are cheap to add.
import { Pixels, ellipseNormal, inEllipse, sheet } from "./lib/pixel.mjs";
import { capsule, tailFrames } from "./president-room.mjs";
import * as P from "./palette.mjs";

const noise = (u, v) => Math.sin(u * 7.3 + v * 3.1) + Math.sin(u * 2.9 - v * 6.4) + Math.sin((u + v) * 5.2);

const calicoOrange = ["#c4622a", "#de7a38", "#f09a52", "#f7b676"];
const calicoBlack = ["#24222a", "#33313a", "#45434d", "#57555f"];
const white = ["#d8d3cf", "#ece8e4", "#f8f6f3", "#ffffff"];

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
  // Executives, for the map's typing stations: しらす in a dark suit, ぽんず with her pink ribbon.
  shirasu: {
    fur: P.cats.shirasu.fur, suit: P.cats.shirasu.suit, accessory: "tie",
    patches: [{ ramp: P.cats.shirasu.mark, test: (u, v, part) => part === "head" && v < 0.1 && Math.abs(u + 0.25) > (v + 0.9) * 0.45 }],
    tail: P.cats.shirasu.mark,
  },
  ponzu: {
    fur: P.cats.ponzu.fur, muzzle: P.cats.ponzu.cream, chest: P.cats.ponzu.cream, stripes: P.cats.ponzu.mark[0], tailStripe: P.cats.ponzu.mark[1],
    accessory: "collar", ribbon: P.cats.ponzu.ribbon,
  },
  // Receptionist: black-and-white hachiware with an orange bow tie.
  kinako: {
    fur: ["#18171c", "#232129", "#302e37", "#3f3d47"],
    patches: [{ ramp: white, test: (u, v, part) => (part === "head" ? v > -0.55 && Math.abs(u) < (v + 0.55) * 0.42 : (u / 0.5) ** 2 + ((v + 0.2) / 0.85) ** 2 <= 1) }],
    muzzle: white, iris: "#8fd16a", whisker: [220, 220, 228, 150], earInner: ["#7a4a5a", "#6a3f4e"], accessory: "bowtie",
    tail: ["#18171c", "#232129", "#302e37", "#3f3d47"],
  },
  // Visitors who come by the reception.
  "guest-gray": {
    fur: ["#5d6474", "#737b8c", "#8b93a3", "#a6adbb"],
    iris: "#e8c24c", whisker: [220, 222, 230, 150], accessory: "necktie", tie: ["#2f4a86", "#4c6aa6"],
  },
  "guest-cream": {
    fur: ["#c39566", "#d8ae7c", "#e8c596", "#f4dab2"],
    muzzle: ["#e8d2b4", "#f4e4cc", "#fff4e4"], chest: ["#e8d2b4", "#f4e4cc", "#fff4e4"],
    stripes: "#b07d4c", tailStripe: "#b07d4c", iris: "#9cc45e", accessory: "necktie", tie: ["#9c2f2a", "#c9493a"],
  },
};

function coatRamp(coat, part, u, v) {
  if (part === "body" && coat.suit) return coat.suit;
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
  if (coat.accessory === "bowtie") {
    img.polygon([[11 + ox, hy + 9], [18 + ox, hy + 12], [11 + ox, hy + 15]], P.orange[2]);
    img.polygon([[25 + ox, hy + 9], [18 + ox, hy + 12], [25 + ox, hy + 15]], P.orange[1]);
    img.rect(17 + ox, hy + 11, 2, 2, P.orange[3]);
  }
  if (coat.accessory === "necktie") {
    img.polygon([[12 + ox, hy + 9], [18 + ox, hy + 12], [14 + ox, hy + 14]], "#fbf9f4");
    img.polygon([[24 + ox, hy + 9], [18 + ox, hy + 12], [22 + ox, hy + 14]], "#fbf9f4");
    img.polygon([[16 + ox, hy + 11], [20 + ox, hy + 11], [21 + ox, hy + 19], [18 + ox, hy + 21], [15 + ox, hy + 19]], coat.tie[1]);
    img.rect(17 + ox, hy + 11, 2, 2, coat.tie[0]);
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

// ---------- Lounge and reception poses ----------
// Front-facing on the sofa, same framing as the meeting front pose: "doze" (eyes shut, slow bob) and "sip" (mug up to the mouth).

// Outlined on its own so it reads against any coat; drawn last so it sits in front of the muzzle while sipping.
function mug() {
  const img = new Pixels(10, 9);
  img.rect(1, 1, 6, 7, P.shell[3]); img.rect(1, 4, 6, 2, P.orange[2]);
  img.rect(2, 1, 4, 1, "#6b3f28"); img.rect(7, 2, 2, 4, P.shell[2]); img.clear(7, 3);
  img.rect(6, 2, 1, 5, P.shell[1]);
  return img.outline(P.OUTLINE);
}

function relaxFrontFrame(coat, pose, frame) {
  const img = new Pixels(42, 46);
  const hy = 15 + (pose === "doze" ? frame : 0);
  shadePart(img, coat, "body", 21, 38, 12, 10, inEllipse(21, 38, 12, 10));
  img.shade(inEllipse(21, 27, 8, 3), ellipseNormal(21, 27, 8, 3), coat.fur);
  const out = new Pixels(42, 46).blit(img.mask((x, y) => y <= 40), 0, 0);
  if (pose === "doze") { armTo(out, coat, 13, 33, 18, 41); armTo(out, coat, 29, 33, 24, 41); }
  else armTo(out, coat, 12, 33, 13, 42);
  drawHead(out, coat, 4, hy);
  const up = pose === "sip" && frame === 1;
  if (pose === "sip") armTo(out, coat, 30, 34, up ? 27 : 28, up ? 24 : 36);
  out.outline(P.OUTLINE);
  drawFace(out, coat, 4, hy, pose === "doze" || up);
  if (pose === "sip") out.blit(mug(), up ? 17 : 19, up ? 17 : 29);
  return out;
}

export const relaxSheet = (name, pose) => sheet([0, 1].map(frame => relaxFrontFrame(STAFF[name], pose, frame)));

// Standing still (the passing frame of the walk), for the coffee machine and the reception counter.
export const standSheet = name => walkFrame(STAFF[name], 1);

// ---------- Typing at a desk (whole-office map) ----------
// Seen from behind and to the right, facing a monitor up and to the left. Every part is its own strip in the same
// 44×52 box (the floor under the chair is at 28,51) and the strips share one timeline, so they stay in step:
// TYPING frames of alternating keystrokes, then a pause to read the screen, then typing again.
export const TYPE_FRAMES = 48;
export const TYPE_BOX = { w: 44, h: 52, x: 28, y: 51 };
const TYPING = 32;
export const typeBeat = t => ({
  typing: t < TYPING,
  nearDown: t < TYPING && (t >> 1) % 2 === 0,
  farDown: t < TYPING && (t >> 1) % 2 === 1,
  bob: t < TYPING ? (t >> 2) % 2 : 0,
  look: t >= TYPING + 2 && t < TYPE_FRAMES - 2,
  blink: t === 41 || t === 42,
  twitch: t === 20 || t === 21,
});
const strip = draw => sheet(Array.from({ length: TYPE_FRAMES }, (_, t) => draw(typeBeat(t), t)));

function typingBody(coat) {
  const img = new Pixels(44, 52);
  shadePart(img, coat, "body", 31, 40, 10, 5.5, inEllipse(31, 40, 10, 5.5));
  shadePart(img, coat, "body", 28, 34, 9.5, 10.5, inEllipse(28, 34, 9.5, 10.5));
  img.shade(inEllipse(23, 24, 6, 4), ellipseNormal(23, 24, 6, 4), coat.fur);
  if (coat.accessory === "tie") { img.polygon([[18, 26], [22, 26], [19, 30]], P.shell[3]); img.polygon([[19, 27], [21, 27], [21, 33], [19, 34]], P.orange[2]); }
  img.outline(P.OUTLINE);
  return img;
}

function typingHead(coat, beat) {
  const img = new Pixels(44, 52);
  const hx = 19, hy = 13 + beat.bob - (beat.look ? 1 : 0);
  const inside = (x, y) => inEllipse(hx, hy, 11, 9.5)(x, y) || inEllipse(hx - 1, hy + 3, 12, 6.5)(x, y) || inEllipse(hx - 9, hy + 3, 4.5, 3.5)(x, y);
  shadePart(img, coat, "head", hx - 4, hy + 1, 14, 10.5, inside);
  // Far ear leans toward the screen; the near ear flicks now and then.
  img.polygon([[hx - 11, hy - 3], [hx - 9, hy - 14], [hx - 3, hy - 8]], coatRamp(coat, "head", -0.65, -1)[2]);
  img.polygon([[hx + 1, hy - 8], beat.twitch ? [hx + 9, hy - 13] : [hx + 6, hy - 15], [hx + 10, hy - 3]], coatRamp(coat, "head", 0.65, -1)[1]);
  const inner = coat.earInner ?? ["#f2a3b0", "#e48d9c"];
  img.polygon([[hx - 9, hy - 5], [hx - 8.5, hy - 11], [hx - 5, hy - 8]], inner[0]);
  if (coat.accessory === "scarf") { img.rect(hx - 4, hy + 9, 15, 2, P.orange[2]); img.rect(hx - 4, hy + 10, 15, 1, P.orange[1]); img.polygon([[hx + 6, hy + 10], [hx + 11, hy + 10], [hx + 9, hy + 16]], P.orange[3]); }
  if (coat.accessory === "collar") { const r = P.cats.ponzu.ribbon; img.rect(hx - 5, hy + 9, 15, 2, r[1]); img.ball(hx - 4, hy + 12, 1.8, 1.8, ["#c98d1f", "#f2c14a", "#fff0a8"]); }
  if (coat.ribbon) { const r = coat.ribbon, bx = hx + 7, by = hy - 11; img.polygon([[bx - 4, by - 2], [bx, by], [bx - 4, by + 2]], r[1]); img.polygon([[bx + 4, by - 2], [bx, by], [bx + 4, by + 2]], r[1]); img.set(bx, by, r[2]); }
  if (coat.accessory === "headset") {
    for (let a = 200; a <= 330; a += 3) { const r = (a * Math.PI) / 180; img.set(Math.round(hx + 1 + Math.cos(r) * 12), Math.round(hy - 1 + Math.sin(r) * 11), P.metal[2]); }
    img.ball(hx + 3, hy + 1, 3, 3.8, P.orange);
  }
  img.outline(P.OUTLINE);

  // Face in three-quarter profile: one eye on the screen, nose at the tip of the muzzle.
  const eye = "#2b2129", ex = hx - 7, ey = hy - 1 - (beat.look ? 1 : 0);
  if (beat.blink) { img.rect(ex - 1, ey + 1, 4, 1, eye); }
  else {
    img.rect(ex, ey - 2, 2, 4, eye); img.set(ex + 2, ey - 1, eye); img.set(ex + 2, ey, eye);
    if (coat.iris) { img.set(ex + 1, ey, coat.iris); img.set(ex + 1, ey + 1, coat.iris); }
    img.set(ex, ey - 2, "#ffffff");
  }
  img.set(hx - 13, hy + 2, "#ec7f95");
  const mouth = coat.whisker ? [190, 170, 180] : P.OUTLINE;
  img.set(hx - 12, hy + 4, mouth); img.set(hx - 11, hy + 5, mouth);
  img.rect(hx - 5, hy + 4, 3, 1, [255, 140, 160, 150]);
  const whisker = coat.whisker ?? [90, 70, 80, 150];
  img.line(hx - 14, hy + 3, hx - 17, hy + 2, whisker); img.line(hx - 14, hy + 5, hx - 17, hy + 6, whisker);
  if (coat.accessory === "glasses") {
    const frame = "#f3c45a";
    img.fill((x, y) => x >= ex - 2 && x <= ex + 3 && y >= ey - 3 && y <= ey + 2 && (x === ex - 2 || x === ex + 3 || y === ey - 3 || y === ey + 2), frame);
    img.line(ex + 4, ey - 1, hx + 4, ey - 2, frame);
  }
  if (coat.accessory === "headset") img.line(hx + 1, hy + 4, hx - 8, hy + 7, P.metal[2]);
  return img;
}

// Front paws on the keyboard; each one lifts two pixels on its keystroke and both rest during the pause.
function typingPaw(coat, near, down) {
  const img = new Pixels(44, 52);
  const [sx, sy, px, py] = near ? [21, 31, 7, 27] : [24, 29, 12, 24];
  const lift = down ? 0 : 2;
  const darker = r => [r[0], r[0], r[1], r[2]];
  const fur = near ? coat.fur : darker(coat.fur), sleeve = coat.suit ? (near ? coat.suit : darker(coat.suit)) : fur;
  const ramp = fur;
  const arm = capsule(sx, sy, px + 2, py - lift, 2.3);
  img.shade(arm.inside, arm.normal, sleeve);
  // Paw tip a shade lighter, with toe lines, so each keystroke reads at map size.
  const tip = [fur[1], fur[2], fur[3], coat.fur[3]];
  img.ball(px, py - lift, 2.8, 2.1, tip);
  img.outline(P.OUTLINE);
  img.set(px - 1, py - lift, ramp[0]); img.set(px + 1, py - lift, ramp[0]);
  return img;
}

function typingTail(coat, frame) {
  const img = new Pixels(44, 52), ramp = coat.tail ?? coat.fur, sway = [0, 1, 2, 1][frame];
  const curve = [[36, 39], [41, 42], [42, 46 - sway], [37 + sway, 49]];
  for (let i = 0; i < 12; i++) {
    const t = i / 11, u = 1 - t;
    const [x, y] = [0, 1].map(k => u ** 3 * curve[0][k] + 3 * u * u * t * curve[1][k] + 3 * u * t * t * curve[2][k] + t ** 3 * curve[3][k]);
    img.ball(x, y, 2.4 - i * 0.04, 2.4 - i * 0.04, ramp);
    if (coat.tailStripe && [5, 8, 11].includes(i)) img.ellipse(x, y, 1.6, 1, coat.tailStripe);
  }
  img.outline(P.OUTLINE);
  return img;
}

export function typingParts(name) {
  const coat = STAFF[name];
  return {
    body: typingBody(coat),
    head: strip(beat => typingHead(coat, beat)),
    near: strip(beat => typingPaw(coat, true, beat.nearDown || !beat.typing)),
    far: strip(beat => typingPaw(coat, false, beat.farDown || !beat.typing)),
    tail: sheet([0, 1, 2, 3].map(frame => typingTail(coat, frame))),
  };
}

// ---------- Laptop for the room screens ----------
// Seen from the front with its screen turned toward a cat on the left (flip it for a cat on the right): the lid
// is a parallelogram whose face shows the screen, the keyboard deck lies in front of it where the paws rest.
// "type" runs SCREEN_CYCLES typing cycles in step with typingParts (lines grow per keystroke, then scroll);
// "idle" is the screensaver.
export const LAPTOP = { w: 26, h: 22, deck: { x: 11, y: 18 } };
const LAPTOP_CYCLES = 3;
function laptopFrame(f) {
  const img = new Pixels(LAPTOP.w, LAPTOP.h);
  const lidTop = x => 1 + (x - 12) * 0.2, lidBottom = x => 15 + (x - 12) * 0.2;
  const inLid = (x, y) => x >= 12 && x <= 22 && y >= lidTop(x) && y <= lidBottom(x);
  // Lid back edge and hinge, then the screen face with a bezel.
  img.fill((x, y) => x >= 22 && x <= 23 && y >= lidTop(x) && y <= lidBottom(x) + 1, P.metal[1]);
  img.fill(inLid, P.metal[3]);
  const inScreen = (x, y) => x >= 13 && x <= 21 && y >= lidTop(x) + 1.2 && y <= lidBottom(x) - 1.2;
  if (f < 0) {
    img.fill(inScreen, "#151a2c");
    img.ellipse(17.5, 9, 1.8, 1.4, P.orange[1]);
  } else {
    const t = f % TYPE_FRAMES, cycle = Math.floor(f / TYPE_FRAMES), beat = typeBeat(t), typed = Math.min(t, 32) >> 2;
    img.fill(inScreen, (x, y) => {
      const row = Math.floor(y - lidTop(x) - 1.5), col = x - 13;
      if (row === 0) return P.orange[2];
      if (row % 2 === 0 || row > 10) return "#1d2640";
      const line = cycle + (row >> 1), length = row >= 9 ? typed : 3 + ((line * 5) % 6);
      if (row >= 9 && col === length && (beat.typing || t % 4 < 2)) return "#ffffff";
      return col < length ? ["#8fd0ff", "#f4efe6", "#9be08a", P.orange[3]][line % 4] : "#1d2640";
    });
  }
  // Keyboard deck in front of the screen, with rows of keys and a trackpad.
  const inDeck = (x, y) => y >= 15 && y <= 20 && x >= 2 + (20 - y) * 0.9 && x <= 22 - (y - 15) * 0.4;
  img.fill(inDeck, (x, y) => (y === 20 ? P.metal[2] : (x + y) % 2 && y < 19 ? P.metal[4] : P.shell[3]));
  img.rect(9, 19, 4, 1, P.metal[3]);
  img.outline(P.OUTLINE);
  return img;
}
export const laptopSheet = kind => (kind === "idle" ? laptopFrame(-1) : sheet(Array.from({ length: TYPE_FRAMES * LAPTOP_CYCLES }, (_, f) => laptopFrame(f))));
