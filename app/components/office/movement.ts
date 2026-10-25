import type { Point } from "./stage";

// `seat` is set while the cat is parked at a spot (or has left through a door); otherwise it walks along `path` toward `dest`.
// `linger` counts down while parked at a short stop such as the coffee machine.
export type Actor = { pos: Point; path: Point[]; seat: string | null; dest: string; heading: 1 | -1; wait: number; stroll: boolean; linger?: number };

export const SPEED = 40; // stage pixels per second
export const TICK = 80;

// Walk down to the area's walking line, along it, then up to the destination.
export function route(from: Point, to: Point, walkY: number): Point[] {
  const points = [{ x: from.x, y: walkY }, { x: to.x, y: walkY }, to];
  return points.filter((point, i) => { const prev = i ? points[i - 1] : from; return point.x !== prev.x || point.y !== prev.y; });
}

export function step(actors: Record<string, Actor>, dt: number): Record<string, Actor> {
  let changed = false;
  const next = Object.fromEntries(Object.entries(actors).map(([id, actor]) => {
    if (actor.seat) return [id, actor];
    changed = true;
    if (actor.wait > 0) return [id, { ...actor, wait: actor.wait - dt * 1000 }];
    let { pos, heading } = actor;
    const path = [...actor.path];
    let budget = SPEED * dt;
    while (path.length && budget > 0) {
      const target = path[0], dx = target.x - pos.x, dy = target.y - pos.y, distance = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) heading = dx > 0 ? 1 : -1;
      if (distance <= budget) { pos = target; path.shift(); budget -= distance; } else { pos = { x: pos.x + (dx / distance) * budget, y: pos.y + (dy / distance) * budget }; budget = 0; }
    }
    return [id, { ...actor, pos, heading, path, seat: path.length ? null : actor.dest, stroll: path.length ? actor.stroll : false }];
  }));
  return changed ? next : actors;
}

// Sends a cat from wherever it is now toward a new destination.
export function sendTo(actor: Actor, from: Point, dest: string, to: Point, walkY: number): Actor {
  return { ...actor, pos: from, path: route(from, to, walkY), seat: null, dest, stroll: false };
}
