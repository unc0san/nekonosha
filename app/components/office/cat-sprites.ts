import { STAFF } from "./staff";

// One place that knows where every cat pose lives, so any area (or a future combined map) can draw any cat.
export type CatPose = "walk" | "stand" | "rest" | "work" | "blink" | "tail" | "front-speak" | "front-nod" | "front-read" | "front-doze" | "front-sip" | "side-speak" | "side-nod" | "side-read";

const SIZE: Record<CatPose, { w: number; h: number; frames: number }> = {
  walk: { w: 44, h: 42, frames: 4 }, stand: { w: 44, h: 42, frames: 1 }, rest: { w: 42, h: 50, frames: 2 }, work: { w: 42, h: 50, frames: 2 }, blink: { w: 42, h: 50, frames: 1 }, tail: { w: 16, h: 16, frames: 4 },
  "front-speak": { w: 42, h: 46, frames: 2 }, "front-nod": { w: 42, h: 46, frames: 2 }, "front-read": { w: 42, h: 46, frames: 2 },
  "front-doze": { w: 42, h: 46, frames: 2 }, "front-sip": { w: 42, h: 46, frames: 2 },
  "side-speak": { w: 42, h: 50, frames: 2 }, "side-nod": { w: 42, h: 50, frames: 2 }, "side-read": { w: 42, h: 50, frames: 2 },
};

// Staff poses drawn for the earlier rooms keep their original files; everything newer is under /office/cats/<id>/.
const ROOM_SHEETS: Partial<Record<CatPose, string>> = {
  walk: "studio/cats/{id}-walk.png", rest: "studio/cats/{id}-rest.png", work: "studio/cats/{id}-work.png", blink: "studio/cats/{id}-blink.png", tail: "studio/cats/{id}-tail.png",
  "front-speak": "meeting/cats/{id}-front-speak.png", "front-nod": "meeting/cats/{id}-front-nod.png", "front-read": "meeting/cats/{id}-front-read.png",
  "side-speak": "meeting/cats/{id}-side-speak.png", "side-nod": "meeting/cats/{id}-side-nod.png", "side-read": "meeting/cats/{id}-side-read.png",
};

export function catSprite(id: string, pose: CatPose) {
  const legacy = STAFF.some(member => member.id === id) ? ROOM_SHEETS[pose] : undefined;
  return { src: `/office/${legacy ? legacy.replace("{id}", id) : `cats/${id}/${pose}.png`}`, ...SIZE[pose] };
}
