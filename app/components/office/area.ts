import type { Point } from "./stage";

// Shared shape for office areas (reception and lounge so far). Coordinates are local to the area,
// so a future single office map only needs an origin per area; doors name the neighbouring area they lead to.
export type AreaProp = { id: string; src: string; x: number; y: number; w: number; h: number; base: number; frames?: number; duration?: number; effect?: "glow" };
export type Door = { id: string; to: string | null; at: Point };
export type AreaSpot = { id: string; kind: "sofa" | "chair" | "beanbag" | "stand" | "counter"; stand: Point; chair?: Point; body?: Point; flip?: boolean; facing?: 1 | -1 };
export type Area = { id: string; name: string; stage: { width: number; height: number }; walkY: number; doors: Door[]; props: AreaProp[]; spots: AreaSpot[] };

// Depth comes from where a thing touches the floor, so walking cats pass in front of or behind furniture correctly.
export const depth = (base: number) => base * 10;

export const DOOR = "door:";

export function areaIndex(area: Area) {
  const spots = Object.fromEntries(area.spots.map(spot => [spot.id, spot]));
  const doors = Object.fromEntries(area.doors.map(door => [`${DOOR}${door.id}`, door]));
  // Every destination (spot or door) resolves to the point a cat walks to.
  const pointOf = (dest: string): Point => doors[dest]?.at ?? spots[dest].stand;
  return { spots, doors, pointOf };
}
