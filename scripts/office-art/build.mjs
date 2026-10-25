// Generates the office PNG assets into public/office/.
// Usage: node scripts/office-art/build.mjs [--preview president.png] [--studio-preview studio.png] [--meeting-preview meeting.png]
//        [--reception-preview reception.png] [--lounge-preview lounge.png]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pixels, scaleUp } from "./lib/pixel.mjs";
import * as room from "./president-room.mjs";
import * as staff from "./staff-cats.mjs";
import * as studio from "./work-studio.mjs";
import * as meeting from "./meeting-room.mjs";
import * as reception from "./reception.mjs";
import * as lounge from "./lounge.mjs";
import { halo } from "./room-shell.mjs";
import { BACKDROP, mapBuilding, mapSprites, mapWalls } from "./office-map.mjs";
import * as P from "./palette.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "public/office/president");
const scene = JSON.parse(readFileSync(join(root, "app/components/office/president-room.json"), "utf8"));

const chair = room.eggChair(), duoDesk = room.duoDesk();
const assets = {
  "room/backdrop.png": room.backdrop(),
  "lights/chandelier.png": room.chandelier(),
  "lights/chandelier-glow.png": room.chandelierGlow(),
  "lights/cat-lamp.png": room.catLamp(),
  "furniture/egg-bookshelf.png": room.eggBookshelf(),
  "furniture/plant-tall.png": room.plant(4),
  "furniture/plant-wide.png": room.plant(21),
  "furniture/rug.png": room.rug(),
  "furniture/tulip-table.png": room.tulipTable(),
  "furniture/duo-desk-top.png": duoDesk.top,
  "furniture/duo-desk-front.png": duoDesk.front,
  "furniture/egg-chair-back.png": chair.back,
  "furniture/egg-chair-front.png": chair.front,
  "furniture/laptop.png": room.laptop(),
};
for (const name of ["shirasu", "ponzu"]) {
  assets[`cats/${name}-work.png`] = room.catSheet(name, "type");
  assets[`cats/${name}-rest.png`] = room.catSheet(name, "rest");
  assets[`cats/${name}-blink.png`] = room.catBlink(name);
  // Torso center (18, 38) and radii come from the cat sprite; express them in tail-sprite pixels.
  const seat = scene.seats.find(item => item.sprite === name);
  const dx = seat.flip ? seat.tail.x + 16 - (seat.body.x + 42) : seat.body.x - seat.tail.x;
  assets[`cats/${name}-tail.png`] = room.tailSheet(name, { x: dx + 18, y: seat.body.y - seat.tail.y + 38, rx: 11, ry: 11.5 });
}

for (const [file, pixels] of Object.entries(assets)) pixels.save(join(out, file));
console.log(`Wrote ${Object.keys(assets).length} sprites to ${out}`);

// Optional flattened preview (first frame of everything) for quick art review.
const previewIndex = process.argv.indexOf("--preview");
if (previewIndex > 0) {
  const { width, height } = scene.stage;
  const stage = new Pixels(width, height);
  const layers = scene.props.map(p => ({ ...p, img: assets[p.src] }));
  for (const seat of scene.seats) {
    const place = (src, at, w, z) => layers.push({ img: assets[src], x: at.x, y: at.y, w, z, flip: seat.flip });
    place("furniture/egg-chair-back.png", seat.chair, 56, 10);
    place(`cats/${seat.sprite}-work.png`, seat.body, 42, 12);
    place("furniture/egg-chair-front.png", seat.chair, 56, 13);
    place(`cats/${seat.sprite}-tail.png`, seat.tail, 16, 14);
    place("furniture/laptop.png", seat.laptop, 20, 15);
  }
  for (const layer of layers.sort((a, b) => a.z - b.z)) {
    const frame = new Pixels(layer.w, layer.img.height).blit(layer.img, 0, 0);
    stage.blit(frame, layer.x, layer.y, { flip: layer.flip });
  }
  scaleUp(stage, 4).save(process.argv[previewIndex + 1]);
  console.log(`Preview: ${process.argv[previewIndex + 1]}`);
}

// ---------- Work studio ----------
const studioOut = join(root, "public/office/studio");
const studioScene = JSON.parse(readFileSync(join(root, "app/components/office/work-studio.json"), "utf8"));
const bag = studio.beanbag();
const studioAssets = {
  "room/backdrop.png": studio.backdrop(),
  "lights/pendant.png": studio.pendant(),
  "lights/pendant-glow.png": studio.pendantGlow(),
  "lights/floor-lamp.png": studio.floorLamp(),
  "furniture/side-table.png": studio.sideTable(),
  "furniture/beanbag-back.png": bag.back,
  "furniture/beanbag-front.png": bag.front,
  "furniture/lounge-rug.png": room.rug(88, 44, P.rugGray),
  "furniture/plant.png": room.plant(33),
};
// Tail and body offsets are the same for every seat, so one tail sheet per cat fits desks and lounge alike.
const { body, tail } = studioScene.seatLayout;
for (const { id } of studioScene.staff) {
  studioAssets[`cats/${id}-work.png`] = staff.seatedSheet(id, "type");
  studioAssets[`cats/${id}-rest.png`] = staff.seatedSheet(id, "rest");
  studioAssets[`cats/${id}-blink.png`] = staff.seatedBlink(id);
  studioAssets[`cats/${id}-tail.png`] = staff.staffTail(id, { x: body.x - tail.x + 18, y: body.y - tail.y + 38, rx: 11, ry: 11.5 });
  studioAssets[`cats/${id}-walk.png`] = staff.walkSheet(id);
}
for (const [file, pixels] of Object.entries(studioAssets)) pixels.save(join(studioOut, file));
console.log(`Wrote ${Object.keys(studioAssets).length} sprites to ${studioOut}`);

const studioPreviewIndex = process.argv.indexOf("--studio-preview");
if (studioPreviewIndex > 0) {
  const all = { ...Object.fromEntries(Object.entries(assets).map(([k, v]) => [`president/${k}`, v])), ...Object.fromEntries(Object.entries(studioAssets).map(([k, v]) => [`studio/${k}`, v])) };
  const stage = new Pixels(studioScene.stage.width, studioScene.stage.height);
  const L = studioScene.seatLayout, layers = studioScene.props.map(p => ({ img: all[p.src], x: p.x, y: p.y, w: p.w, z: p.base * 10 }));
  const add = (src, x, y, w, z, flip = false) => layers.push({ img: all[src], x, y, w, z, flip });
  for (const desk of studioScene.desks) {
    const { x, y } = desk.chair, z = (y + 66) * 10;
    add("studio/lights/pendant-glow.png", x + L.glow.x, y + L.glow.y, 48, 4); add("studio/lights/pendant.png", x + L.pendant.x, L.pendant.y, 14, 5);
    add("president/furniture/egg-chair-back.png", x, y, 56, z); add("studio/furniture/side-table.png", x + L.table.x, y + L.table.y, 30, z + 1);
    add(`studio/cats/${desk.staff}-work.png`, x + L.body.x, y + L.body.y, 42, z + 2); add("president/furniture/egg-chair-front.png", x, y, 56, z + 3);
    add(`studio/cats/${desk.staff}-tail.png`, x + L.tail.x, y + L.tail.y, 16, z + 4); add("president/furniture/laptop.png", x + L.laptop.x, y + L.laptop.y, 20, z + 5);
  }
  const [chair, beanbag] = studioScene.lounge;
  add("president/furniture/egg-chair-back.png", chair.chair.x, chair.chair.y, 56, (chair.chair.y + 66) * 10, true);
  add("president/furniture/egg-chair-front.png", chair.chair.x, chair.chair.y, 56, (chair.chair.y + 66) * 10 + 3, true);
  add("studio/furniture/beanbag-back.png", beanbag.chair.x, beanbag.chair.y, 46, (beanbag.chair.y + 26) * 10);
  add(`studio/cats/omochi-rest.png`, beanbag.chair.x, beanbag.chair.y - 31, 42, (beanbag.chair.y + 26) * 10 + 2, true);
  add("studio/furniture/beanbag-front.png", beanbag.chair.x, beanbag.chair.y, 46, (beanbag.chair.y + 26) * 10 + 3);
  add("studio/cats/mugi-walk.png", 120, studioScene.aisleY - 40, 44, studioScene.aisleY * 10 + 5);
  for (const layer of layers.sort((a, b) => a.z - b.z)) stage.blit(new Pixels(layer.w, layer.img.height).blit(layer.img, 0, 0), layer.x, layer.y, { flip: layer.flip });
  scaleUp(stage, 3).save(process.argv[studioPreviewIndex + 1]);
  console.log(`Studio preview: ${process.argv[studioPreviewIndex + 1]}`);
}

// ---------- Meeting room ----------
const meetingOut = join(root, "public/office/meeting");
const meetingAssets = {
  "room/backdrop.png": meeting.backdrop(),
  "room/whiteboard.png": meeting.whiteboard(),
  "room/monitor.png": meeting.monitor(),
  "room/monitor-glow.png": meeting.monitorGlow(),
  "room/front-glass.png": meeting.frontGlass(),
  "lights/saucer-lamp.png": meeting.saucerLamp(),
  "lights/saucer-glow.png": meeting.saucerGlow(),
  "furniture/oval-table.png": meeting.ovalTable(),
  "furniture/table-items.png": meeting.tableItems(),
  "furniture/armchair-back.png": meeting.armchairBack(),
  "furniture/rug.png": room.rug(240, 70, P.rugGray),
  "furniture/plant-left.png": room.plant(41),
  "furniture/plant-right.png": room.plant(52),
};
for (const { id } of studioScene.staff) for (const view of ["front", "side"]) for (const pose of ["speak", "nod", "read"]) {
  meetingAssets[`cats/${id}-${view}-${pose}.png`] = staff.meetingSheet(id, view, pose);
}
for (const [file, pixels] of Object.entries(meetingAssets)) pixels.save(join(meetingOut, file));
console.log(`Wrote ${Object.keys(meetingAssets).length} sprites to ${meetingOut}`);

const meetingPreviewIndex = process.argv.indexOf("--meeting-preview");
if (meetingPreviewIndex > 0) {
  const meetingScene = JSON.parse(readFileSync(join(root, "app/components/office/meeting-room.json"), "utf8"));
  const all = { ...Object.fromEntries(Object.entries(assets).map(([k, v]) => [`president/${k}`, v])), ...Object.fromEntries(Object.entries(studioAssets).map(([k, v]) => [`studio/${k}`, v])), ...Object.fromEntries(Object.entries(meetingAssets).map(([k, v]) => [`meeting/${k}`, v])) };
  const stage = new Pixels(meetingScene.stage.width, meetingScene.stage.height);
  const L = studioScene.seatLayout, layers = meetingScene.props.map(p => ({ img: all[p.src], x: p.x, y: p.y, w: p.w, z: p.z }));
  const add = (src, x, y, w, z, flip = false) => layers.push({ img: all[src], x, y, w, z, flip });
  meetingScene.seats.forEach((seat, i) => {
    const pose = ["speak", "nod", "read"][i % 3];
    if (seat.view === "front") {
      add("meeting/furniture/armchair-back.png", seat.body.x + 2, seat.body.y + 18, 38, 10);
      add(`meeting/cats/${seat.staff}-front-${pose}.png`, seat.body.x, seat.body.y, 42, 14);
      return;
    }
    const { x, y } = seat.chair, f = seat.flip;
    add("president/furniture/egg-chair-back.png", x, y, 56, 11, f);
    add(`meeting/cats/${seat.staff}-side-${pose}.png`, f ? x + 56 - L.body.x - 42 : x + L.body.x, y + L.body.y, 42, 14, f);
    add("president/furniture/egg-chair-front.png", x, y, 56, 15, f);
    add(`studio/cats/${seat.staff}-tail.png`, f ? x + 56 - L.tail.x - 16 : x + L.tail.x, y + L.tail.y, 16, 16, f);
  });
  for (const layer of layers.sort((a, b) => a.z - b.z)) stage.blit(new Pixels(layer.w, layer.img.height).blit(layer.img, 0, 0), layer.x, layer.y, { flip: layer.flip });
  scaleUp(stage, 3).save(process.argv[meetingPreviewIndex + 1]);
  console.log(`Meeting preview: ${process.argv[meetingPreviewIndex + 1]}`);
}

// ---------- Reception and lounge ----------
// Room art lives per area; every new cat pose goes into one shared public/office/cats/<id>/ folder so any area can use it.
const sofa = lounge.sofa();
const areaAssets = {
  "reception/room/backdrop.png": reception.backdrop(),
  "reception/room/logo-sign.png": reception.logoSign(),
  "reception/lights/arc-lamp.png": reception.arcLamp(),
  "reception/lights/lamp-glow.png": halo(64, 44),
  "reception/furniture/counter.png": reception.counter(),
  "reception/furniture/counter-items.png": reception.counterItems(),
  "reception/furniture/plant-entrance.png": room.plant(61),
  "reception/furniture/plant-lounge.png": room.plant(72),
  "lounge/room/backdrop.png": lounge.backdrop(),
  "lounge/furniture/sofa-back.png": sofa.back,
  "lounge/furniture/sofa-front.png": sofa.front,
  "lounge/furniture/coffee-bar.png": lounge.coffeeBar(),
  "lounge/furniture/coffee-machine.png": lounge.coffeeMachine(),
  "lounge/furniture/steam.png": lounge.steam(),
  "lounge/furniture/table-snacks.png": lounge.tableSnacks(),
  "lounge/furniture/rug.png": room.rug(196, 54, P.rugOrange),
  "lounge/furniture/plant.png": room.plant(83),
};
for (const { id } of studioScene.staff) {
  areaAssets[`cats/${id}/front-doze.png`] = staff.relaxSheet(id, "doze");
  areaAssets[`cats/${id}/front-sip.png`] = staff.relaxSheet(id, "sip");
  areaAssets[`cats/${id}/stand.png`] = staff.standSheet(id);
}
for (const pose of ["speak", "nod", "read"]) areaAssets[`cats/kinako/front-${pose}.png`] = staff.meetingSheet("kinako", "front", pose);
for (const id of ["kinako", "guest-gray", "guest-cream"]) {
  areaAssets[`cats/${id}/walk.png`] = staff.walkSheet(id);
  areaAssets[`cats/${id}/stand.png`] = staff.standSheet(id);
}
for (const id of ["guest-gray", "guest-cream"]) {
  areaAssets[`cats/${id}/side-read.png`] = staff.meetingSheet(id, "side", "read");
  areaAssets[`cats/${id}/tail.png`] = staff.staffTail(id, { x: body.x - tail.x + 18, y: body.y - tail.y + 38, rx: 11, ry: 11.5 });
}
// Typing at a map work station, one part per strip so the paws, head and tail move independently.
for (const id of ["kohaku", "mitsumame", "mugi", "kurogoma", "omochi", "shirasu", "ponzu"]) for (const [part, img] of Object.entries(staff.typingParts(id))) areaAssets[`cats/${id}/type-${part}.png`] = img;
for (const kind of ["type", "idle"]) areaAssets[`desk/laptop-${kind}.png`] = staff.laptopSheet(kind);
const officeOut = join(root, "public/office");
for (const [file, pixels] of Object.entries(areaAssets)) pixels.save(join(officeOut, file));
console.log(`Wrote ${Object.keys(areaAssets).length} sprites for the reception, lounge and shared cats`);

// Flattened first-frame previews with a sample cast in place.
const everything = { ...Object.fromEntries(Object.entries(assets).map(([k, v]) => [`president/${k}`, v])), ...Object.fromEntries(Object.entries(studioAssets).map(([k, v]) => [`studio/${k}`, v])), ...Object.fromEntries(Object.entries(meetingAssets).map(([k, v]) => [`meeting/${k}`, v])), ...areaAssets };
function previewArea(flag, sceneFile, cast) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return;
  const area = JSON.parse(readFileSync(join(root, `app/components/office/${sceneFile}`), "utf8"));
  const stage = new Pixels(area.stage.width, area.stage.height);
  const layers = [...area.props.map(p => ({ img: everything[p.src], x: p.x, y: p.y, w: p.w, z: p.base * 10 })), ...cast(area).map(([src, x, y, w, z, flip]) => ({ img: everything[src], x, y, w, z, flip }))];
  for (const layer of layers.sort((a, b) => a.z - b.z)) stage.blit(new Pixels(layer.w, layer.img.height).blit(layer.img, 0, 0), layer.x, layer.y, { flip: layer.flip });
  scaleUp(stage, 3).save(process.argv[index + 1]);
  console.log(`Preview: ${process.argv[index + 1]}`);
}
const spot = (area, id) => area.spots.find(s => s.id === id);
const chairCast = (area, id, catSrc, tailSrc, flip = false) => {
  const { x, y } = spot(area, id).chair, z = (y + 66) * 10;
  return [["president/furniture/egg-chair-back.png", x, y, 56, z, flip], [catSrc, flip ? x + 56 - body.x - 42 : x + body.x, y + body.y, 42, z + 2, flip],
    ["president/furniture/egg-chair-front.png", x, y, 56, z + 3, flip], [tailSrc, flip ? x + 56 - tail.x - 16 : x + tail.x, y + tail.y, 16, z + 4, flip]];
};
previewArea("--reception-preview", "reception.json", area => {
  const desk = spot(area, "front-desk").body, counterSpot = spot(area, "counter").stand;
  return [["cats/kinako/front-speak.png", desk.x, desk.y, 42, 1440],
    ["cats/guest-cream/stand.png", counterSpot.x - 20, counterSpot.y - 40, 44, counterSpot.y * 10 + 5],
    ...chairCast(area, "waiting", "cats/guest-gray/side-read.png", "cats/guest-gray/tail.png")];
});
previewArea("--lounge-preview", "lounge.json", area => {
  const sofaCats = [["sofa-1", "mugi", "front-sip"], ["sofa-2", "kurogoma", "front-doze"], ["sofa-3", "omochi", "front-speak"]];
  const coffee = spot(area, "coffee").stand;
  return [...sofaCats.map(([id, cat, pose]) => [pose === "front-speak" ? `meeting/cats/${cat}-front-speak.png` : `cats/${cat}/${pose}.png`, spot(area, id).body.x, spot(area, id).body.y, 42, 1240]),
    ...chairCast(area, "chair", "studio/cats/kohaku-rest.png", "studio/cats/kohaku-tail.png", true),
    ["studio/furniture/beanbag-back.png", 306, 138, 46, 1640], ["studio/cats/mitsumame-rest.png", 306, 107, 42, 1642, true], ["studio/furniture/beanbag-front.png", 306, 138, 46, 1643],
    ["cats/mitsumame/stand.png", coffee.x - 20, coffee.y - 40, 44, coffee.y * 10 + 5, true],
    ["lounge/furniture/steam.png", area.steam.x, area.steam.y, 12, 1320]];
});

// ---------- Whole-office map (isometric 3/4 view) ----------
// Building shell and the wall overlay as full-stage PNGs; furniture as sprites with their world anchors.
const mapPieces = mapSprites();
const mapWallLayer = mapWalls();
mapBuilding().save(join(officeOut, "map/building.png"));
mapWallLayer.img.save(join(officeOut, "map/walls.png"));
for (const [name, { img }] of Object.entries(mapPieces)) img.save(join(officeOut, `map/${name}.png`));
const mapMeta = { sprites: Object.fromEntries(Object.entries(mapPieces).map(([name, { w, h, ax, ay, frames }]) => [name, { w, h, ax, ay, ...(frames ? { frames } : {}) }])), walls: mapWallLayer.meta, backdrop: BACKDROP };
writeFileSync(join(root, "app/components/office/office-map-sprites.json"), `${JSON.stringify(mapMeta)}\n`);
console.log(`Wrote the office map building, ${mapWallLayer.meta.length} wall chunks and ${Object.keys(mapPieces).length} furniture sprites`);
