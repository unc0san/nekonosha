import { STAFF, onRequest, openTasksByStaff, type OfficeTask } from "./staff";

// One clock and one timetable for the whole office. The map and every room screen read the same schedule, so a cat
// is never in a meeting on one screen and at its desk on another, and the visitor is at the same step everywhere.

let epoch: number | null = null;
// Milliseconds since the office first appeared on this page (shared by every view; only call it in the browser).
export function officeTime() {
  epoch ??= Date.now();
  return Date.now() - epoch;
}
// For a screen that is just opening: where the office schedule is now, so the screen starts in step with the others.
export const officeNow = () => (typeof window === "undefined" ? 0 : officeTime());

// "work": at the desk typing. "rest": in the lounge. "coffee": a working cat's short break at the lounge coffee machine.
// "meeting": working cats in the meeting room for part of every round.
export type Duty = "work" | "rest" | "coffee" | "meeting";

const MEETING = { every: 60000, start: 24000, length: 22000, seats: 3 };
const COFFEE = { every: 15000, length: 6000 };

export function meetingWindow(t: number) {
  const phase = t % MEETING.every, open = phase >= MEETING.start && phase < MEETING.start + MEETING.length;
  return { open, startsIn: open ? 0 : (MEETING.start - phase + MEETING.every) % MEETING.every };
}

// Who is in the meeting right now, in seat order. A meeting needs at least two cats with open tasks; who attends
// rotates each round. Cats busy with a request stay at their desks.
export function meetingMembers(tasks: OfficeTask[], t: number): string[] {
  if (!meetingWindow(t).open) return [];
  const open = openTasksByStaff(tasks), busy = onRequest(tasks), working = STAFF.map(s => s.id).filter(id => open[id] && !busy.has(id));
  if (working.length < 2) return [];
  const round = Math.floor(t / MEETING.every) % working.length;
  return [...working.slice(round), ...working.slice(0, round)].slice(0, MEETING.seats);
}

export function dutiesAt(tasks: OfficeTask[], t: number): Record<string, Duty> {
  const open = openTasksByStaff(tasks), members = meetingMembers(tasks, t);
  const duties: Record<string, Duty> = Object.fromEntries(STAFF.map(({ id }) => [id, members.includes(id) ? "meeting" : open[id] ? "work" : "rest"]));
  const busy = onRequest(tasks), atDesks = STAFF.map(s => s.id).filter(id => duties[id] === "work" && !busy.has(id));
  if (atDesks.length && t % COFFEE.every >= COFFEE.every - COFFEE.length) duties[atDesks[Math.floor(t / COFFEE.every) % atDesks.length]] = "coffee";
  return duties;
}

// The visitor's day, one visitor per meeting round: walk in, check in at the counter, be shown to the waiting chair,
// wait, go through to the meeting room for the staff meeting, and leave by the entrance. Then the next visitor arrives.
export type VisitPhase = "gap" | "arrive" | "greet" | "guide" | "wait" | "leave" | "meeting" | "depart";
const VISIT: [VisitPhase, number][] = [["gap", 4000], ["arrive", 4000], ["greet", 4000], ["guide", 3000], ["wait", 5000], ["leave", 4000], ["meeting", MEETING.length], ["depart", 9000], ["gap", 5000]];
const VISIT_LENGTH = VISIT.reduce((sum, [, length]) => sum + length, 0);

export function visitAt(t: number): { count: number; phase: VisitPhase; elapsed: number } {
  let rest = t % VISIT_LENGTH;
  for (const [phase, length] of VISIT) {
    if (rest < length) return { count: Math.floor(t / VISIT_LENGTH), phase, elapsed: rest };
    rest -= length;
  }
  return { count: Math.floor(t / VISIT_LENGTH), phase: "gap", elapsed: 0 };
}
