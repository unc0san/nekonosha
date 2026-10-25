// Generates the office PNG assets into public/office/.
// Usage: node scripts/office-art/build.mjs [--preview path/to/preview.png]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pixels, scaleUp } from "./lib/pixel.mjs";
import * as room from "./president-room.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "public/office/president");
const scene = JSON.parse(readFileSync(join(root, "app/components/office/president-room.json"), "utf8"));

const chair = room.eggChair();
const assets = {
  "room/backdrop.png": room.backdrop(),
  "room/city-twinkle.png": room.cityTwinkle(),
  "lights/chandelier.png": room.chandelier(),
  "lights/chandelier-glow.png": room.chandelierGlow(),
  "lights/cat-lamp.png": room.catLamp(),
  "furniture/egg-bookshelf.png": room.eggBookshelf(),
  "furniture/plant-tall.png": room.plant(4),
  "furniture/plant-wide.png": room.plant(21),
  "furniture/rug.png": room.rug(),
  "furniture/tulip-table.png": room.tulipTable(),
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
