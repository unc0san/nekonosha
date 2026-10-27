"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import plan from "./office-map.json";
import ART_META from "./office-map-sprites.json";
import presidentData from "./president-room.json";
import receptionData from "./reception.json";
import styles from "./office-stage.module.css";
import { Sprite, type Point } from "./stage";
import { CatSprite, Hit, NameTag, ProfilePanel, type Profile } from "./area-stage";
import { ExecutiveDesk } from "./executive-desk";
import { catSprite, type CatPose } from "./cat-sprites";
import { TICK, step, type Actor } from "./movement";
import { STAFF, deskLabel, openTasksByStaff, type OfficeTask } from "./staff";
import { dutiesAt, meetingMembers, officeNow, officeTime, visitAt, type Duty, type VisitPhase } from "./office-schedule";
import { useMapScale } from "./use-map-scale";

type RoomId = keyof typeof plan.rooms;
type Kind = keyof typeof ART_META.sprites;
type Spot = { id: string; kind: string; room: RoomId; at: Point; via: Point[] };
type Sim = { actors: Record<string, Actor>; t: number };
type Status = { label: string; job: string; room: RoomId; tone?: "rest" | "walk" };

const { width: W, height: H } = plan.stage;
const { x: OX, y: OY } = plan.origin;
const ART = "/office/map/";
const EGG = "/office/president/furniture/egg-chair-";
const BEANBAG = "/office/studio/furniture/beanbag-";
const HOST = receptionData.host;
const GUESTS = receptionData.guests;
const EXECUTIVES = presidentData.seats.map(seat => ({ ...seat, id: seat.sprite, coat: seat.sprite === "shirasu" ? "白とグレー" : "茶トラ" }));
const REST_SPOTS = ["sofa-1", "sofa-2", "sofa-3", "chair", "beanbag"];
const MEETING_SEATS = ["seat-1", "seat-2", "seat-3"];
const SOFA_POSES: Record<string, { pose: CatPose; label: string; duration: number }> = {
  "sofa-1": { pose: "front-sip", label: "休憩中", duration: 2.4 },
  "sofa-2": { pose: "front-doze", label: "休憩中", duration: 3.2 },
  "sofa-3": { pose: "front-sip", label: "休憩中", duration: 2.8 },
};
// Where the visitor is during each step of the shared visit schedule. At "exit" the visitor has left the building.
const VISIT_SPOT: Record<VisitPhase, string> = { gap: "exit", arrive: "counter", greet: "counter", guide: "waiting", wait: "waiting", leave: "seat-4", meeting: "seat-4", depart: "exit" };
// Footprints of furniture whose anchor is a corner rather than its middle (for paint order).
const FOOT: Partial<Record<string, [number, number]>> = { bookshelf: [12, 40], cabinet: [24, 12], counter: [60, 16], "coffee-bar": [52, 16] };

// Isometric projection: u runs to the lower right, v to the lower left; paint order follows u + v.
const screen = (u: number, v: number, z = 0) => ({ x: OX + u - v, y: OY + (u + v) / 2 - z });
const depth = (u: number, v: number) => Math.round((u + v) * 3) + 10;
const inside = (r: { u: number; v: number; du: number; dv: number }, u: number, v: number) => u >= r.u && u < r.u + r.du && v >= r.v && v < r.v + r.dv;
// The president's suite is a step up; its stairs come down into the corridor.
function elevation(u: number, v: number) {
  if (inside(plan.rooms.suite, u, v)) return plan.rooms.suite.z;
  const s = plan.stairs;
  if (u >= s.u && u < s.u + s.du && v >= s.v && v < s.v + 22) return plan.rooms.suite.z * (1 - (v - s.v) / 24);
  return 0;
}
const ground = (p: Point) => screen(p.x, p.y, elevation(p.x, p.y));
// Sofa layers, back to front: the back with the far arm, one layer per seat (nearer seats overlap farther ones), then
// the seat front with the near arm.
const SOFA = plan.seats.sofa, SOFA_SEATS = ["sofa-1", "sofa-2", "sofa-3"], SEAT_Z = 12, SEAT_EDGE = SOFA.v + 24;
const SOFA_ORDER = depth(SOFA.u + SOFA.du / 2, SOFA.v + 14), SOFA_FRONT = SOFA_ORDER + SOFA_SEATS.length + 1;
const seatOrder = (spot: string) => SOFA_ORDER + 1 + SOFA_SEATS.indexOf(spot);
const at = (x: number, y: number, extra: Record<string, number> = {}) => ({ "--x": x, "--y": y, ...extra }) as CSSProperties;
const point = ([x, y]: number[]): Point => ({ x, y });
// The sky and lawn reach the stage edges in flat bands; the frame repeats them so a wide screen has no empty sides.
const backdrop = (scale: number) => ({ backgroundImage: `linear-gradient(${ART_META.backdrop.map(([color, from, to]) => `${color} ${(from as number) * scale}px ${(to as number) * scale}px`).join(", ")})` });

const SPOTS: Record<string, Spot> = Object.fromEntries((Object.keys(plan.spots) as RoomId[]).flatMap(room => plan.spots[room].list.map(s => [s.id, { id: s.id, kind: s.kind, room, at: point(s.at), via: s.via.map(point) }])));
const roomOfSpot = (id: string) => SPOTS[id].room;

// A cat walking through the lounge sorts against the sofa as a whole: in front of the seat edge it passes over it,
// behind the back or beside the far arm it passes under it, and stepping onto a seat it climbs up into that seat's layer.
function walkerLayer(p: Point) {
  const z = depth(p.x, p.y) + 1;
  if (!inside(plan.rooms.lounge, p.x, p.y)) return { z, lift: 0 };
  if (p.y >= SEAT_EDGE + 4) return { z: p.x >= SOFA.u - 12 ? Math.max(z, SOFA_FRONT + 1) : z, lift: 0 };
  if (p.y >= SOFA.v && p.x >= SOFA.u && p.x < SOFA.u + SOFA.du) {
    const seat = SOFA_SEATS.reduce((a, b) => (Math.abs(SPOTS[b].at.x - p.x) < Math.abs(SPOTS[a].at.x - p.x) ? b : a));
    return { z: seatOrder(seat), lift: SEAT_Z * Math.min(1, (SEAT_EDGE + 4 - p.y) / 8) };
  }
  return { z: Math.min(z, SOFA_ORDER - 1), lift: 0 };
}

// Back out through the spot's walkway to the room's door, along the corridor on the cat's own lane, and in through
// the next room's door. Walkways keep clear of furniture and only cross walls at doors.
function route(from: string, to: string, lane: number): Point[] {
  const a = SPOTS[from], b = SPOTS[to];
  const out = [...a.via].reverse(), into = [...b.via, b.at];
  if (a.room === b.room) return [...out, ...into];
  const doorA = plan.spots[a.room], doorB = plan.spots[b.room];
  return [...out, point(doorA.door), { x: doorA.corridor[0], y: lane }, { x: doorB.corridor[0], y: lane }, point(doorB.door), ...into];
}

const ACTORS = [...STAFF.map(s => s.id), "guest"];
const laneOf = (id: string) => plan.corridor.lane + (ACTORS.indexOf(id) - 2) * 4;

// Where each cat should be at office time t, from the shared schedule (tasks, meetings, coffee, the visit).
function wanted(actors: Record<string, Actor>, id: string, duties: Record<string, Duty>, members: string[], t: number): string {
  if (id === "guest") return VISIT_SPOT[visitAt(t).phase];
  const duty = duties[id];
  if (duty === "work") return `desk:${id}`;
  if (duty === "meeting") return MEETING_SEATS[members.indexOf(id)];
  if (duty === "coffee") return "coffee";
  // Resting cats keep the lounge seat they already have; newcomers take the first free one (same rule as the lounge screen).
  const held = actors[id]?.dest;
  if (held && REST_SPOTS.includes(held)) return held;
  const taken = STAFF.filter(s => s.id !== id).map(s => actors[s.id]?.dest);
  return REST_SPOTS.find(spot => !taken.includes(spot)) ?? `desk:${id}`;
}

function start(tasks: OfficeTask[], t: number): Sim {
  const actors: Record<string, Actor> = {}, duties = dutiesAt(tasks, t), members = meetingMembers(tasks, t);
  for (const id of ACTORS) {
    const spot = wanted(actors, id, duties, members, t);
    actors[id] = { pos: SPOTS[spot].at, path: [], seat: spot, dest: spot, heading: 1, wait: 0, stroll: false };
  }
  return { actors, t };
}

// One simulation tick: walk, then send every parked cat whose place in the schedule has changed on its way.
// Cats already walking finish their trip first and are re-routed from where they arrive.
function tick(previous: Sim, dt: number, tasks: OfficeTask[], t: number, reduced: boolean): Sim {
  let actors = step(previous.actors, dt);
  const duties = dutiesAt(tasks, t), members = meetingMembers(tasks, t);
  for (const id of ACTORS) {
    const actor = actors[id], dest = wanted(actors, id, duties, members, t);
    if (!actor.seat || actor.dest === dest) continue;
    actors = { ...actors, [id]: reduced
      ? { ...actor, pos: SPOTS[dest].at, path: [], seat: dest, dest }
      : { ...actor, path: route(actor.seat, dest, laneOf(id)), seat: null, dest } };
  }
  return { actors, t };
}

// A furniture sprite from the map sheet standing on world point (u, v).
function Piece({ kind, u, v, order }: { kind: Kind; u: number; v: number; order?: number }) {
  const s = ART_META.sprites[kind], p = screen(u, v, elevation(u, v)), foot = FOOT[kind] ?? [0, 0];
  return <Sprite src={`${ART}${kind}.png`} x={p.x - s.ax} y={p.y - s.ay} w={s.w} h={s.h} z={order ?? depth(u + foot[0] / 2, v + foot[1] / 2)}/>;
}

// Work station: desk and monitor, an office chair, and a cat built from separate strips (far paw, tail, body, head,
// near paw). At work the strips share one 48-frame timeline: keystrokes, then a pause to read the screen; the screen
// strip runs three of those cycles so typed lines scroll up. An empty station shows the screensaver. Each cat runs
// on its own offset so the room never types in unison.
const TYPE = { w: 44, h: 52, x: 28, y: 51, frames: 48, duration: 4.8 };
const STATION = plan.seats.station;
const SCREENS: Record<string, string> = { kohaku: "code", mitsumame: "chart", mugi: "doc", kurogoma: "chart", omochi: "doc", shirasu: "doc", ponzu: "code" };
const TYPISTS = ["shirasu", "ponzu", ...STAFF.map(s => s.id)];
const offsetOf = (id: string) => -((TYPISTS.indexOf(id) * 1.7) % TYPE.duration);
function Station({ spot, cat, children }: { spot: Point; cat?: string; children?: (box: Point) => ReactNode }) {
  const u = spot.x - STATION.cat[0], v = spot.y - STATION.cat[1], corner = screen(u, v, elevation(spot.x, spot.y)), seat = ground(spot);
  const order = depth(spot.x, spot.y), deskOrder = depth(u + STATION.depth / 2, v + STATION.width / 2), delay = cat ? offsetOf(cat) : 0;
  const piece = (kind: Kind, z: number, extra: { frames?: number; duration?: number; delay?: number } = {}) => {
    const s = ART_META.sprites[kind];
    return <Sprite key={`${kind}-${cat ?? ""}`} src={`${ART}${kind}.png`} x={corner.x - s.ax} y={corner.y - s.ay} w={s.w} h={s.h} z={z} {...extra}/>;
  };
  const box = { x: seat.x - TYPE.x, y: seat.y - TYPE.y };
  const part = (name: string, z: number, frames = TYPE.frames, duration = TYPE.duration) => <Sprite key={`${cat}-${name}`} src={`/office/cats/${cat}/type-${name}.png`} x={box.x} y={box.y} w={TYPE.w} h={TYPE.h} z={z} frames={frames} duration={duration} delay={delay}/>;
  return <>
    {piece("station-desk", deskOrder)}
    {cat ? piece(`station-screen-${SCREENS[cat] ?? "code"}` as Kind, deskOrder + 1, { frames: TYPE.frames * 3, duration: TYPE.duration * 3, delay }) : piece("station-screen-idle", deskOrder + 1)}
    {piece("station-chair", order)}
    {cat && <>{part("far", order + 1)}{part("tail", order + 1, 4, 1.6)}{part("body", order + 2, 1)}{part("head", order + 3)}{part("near", order + 4)}</>}
    {cat && children?.(box)}
    {piece("station-back", order + 5)}
  </>;
}

// The president's suite desk group (drawn in suite-screen pixels) placed so the desk's floor centre stands on the
// map's executive spot.
const EXEC = plan.seats.executive, EXEC_FLOOR = { x: presidentData.desk.x + 68, y: presidentData.desk.y + 46 };
const EXEC_AT = (() => { const p = screen(EXEC.u, EXEC.v, plan.rooms.suite.z); return { x: p.x - EXEC_FLOOR.x, y: p.y - EXEC_FLOOR.y }; })();

// Egg chair facing the viewer, with whoever sits in it between its shell and front rim.
function EggChair({ spot, children }: { spot: Point; children?: (body: Point, order: number) => ReactNode }) {
  const p = ground(spot), order = depth(spot.x, spot.y), x = p.x - 28, y = p.y - 66;
  return <>
    <Sprite src={`${EGG}back.png`} x={x} y={y} w={56} h={68} z={order}/>
    {children?.({ x: x + 11, y: y - 2 }, order + 1)}
    <Sprite src={`${EGG}front.png`} x={x} y={y} w={56} h={68} z={order + 2}/>
  </>;
}

export default function OfficeMap({ department, tasks, onOpenRoom }: { department: string; tasks: OfficeTask[]; onOpenRoom: (id: string) => void }) {
  const { frame, scale } = useMapScale(W);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState("shirasu");
  const [sim, setSim] = useState(() => start(tasks, officeNow()));

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => setSim(previous => tick(previous, TICK / 1000, tasks, officeTime(), reduced)), TICK);
    return () => window.clearInterval(timer);
  }, [paused, tasks]);

  const open = openTasksByStaff(tasks);
  const visit = visitAt(sim.t), guest = GUESTS[visit.count % GUESTS.length];
  const guestActor = sim.actors.guest, guestGone = guestActor.seat === "exit";
  const hostTalking = guestActor.seat === "counter";
  const working = (id: string) => tasks.some(t => !t.done && t.owner === id);

  const people = [
    ...EXECUTIVES.map(e => ({ id: e.id, name: e.cat, role: e.role, coat: e.coat, file: "役員" })),
    ...STAFF.map(s => ({ id: s.id, name: s.name, role: s.role, coat: s.coat, file: deskLabel(s.id, department) })),
    { id: HOST.id, name: HOST.name, role: HOST.role, coat: HOST.coat, file: "受付" },
    ...(guestGone ? [] : [{ id: "guest", name: guest.name, role: "来客", coat: guest.coat, file: "VISITOR" }]),
  ];
  const nameOf = (id: string) => people.find(p => p.id === id)?.name ?? id;

  const statusOf = (id: string): Status => {
    const exec = EXECUTIVES.find(e => e.id === id);
    if (exec) { const task = tasks.find(t => !t.done && t.owner === exec.cat); return task ? { label: "作業中", room: "suite", job: `パソコンで「${task.title}」に取り組んでいます。` } : { label: "休憩中", tone: "rest", room: "suite", job: "担当タスクが完了。席でうたた寝しています。" }; }
    if (id === HOST.id) return { label: hostTalking ? "ご案内中" : "受付中", room: "reception", job: `来客対応・ご案内（いまのお客さま：${guest.name}）` };
    const actor = sim.actors[id], room = roomOfSpot(actor.dest);
    if (!actor.seat) return { label: "移動中", tone: "walk", room, job: `${plan.rooms[room].name}へ向かっています。` };
    if (id === "guest") return { label: { counter: "受付中", waiting: "待合で待機中", "seat-4": "打ち合わせ中" }[actor.seat] ?? "お帰り", tone: actor.seat === "waiting" ? "rest" : undefined, room, job: `ご用件：${guest.purpose}` };
    const spot = actor.seat;
    if (spot === "coffee") return { label: "コーヒー休憩", tone: "rest", room, job: "コーヒーマシンでひと息。すぐ戻ります。" };
    if (MEETING_SEATS.includes(spot)) return { label: "会議中", room, job: `会議室で「${open[id]?.[0]?.title ?? "進め方"}」の打ち合わせ中。` };
    if (spot.startsWith("desk:")) return { label: "作業中", room, job: `パソコンで「${open[id]?.[0]?.title ?? "仕事"}」を進めています。` };
    return { label: SOFA_POSES[spot]?.label ?? "ひと休み中", tone: "rest", room, job: "担当分が片づいたので、ラウンジでのんびり休憩中。" };
  };

  const shown = people.find(p => p.id === selected) ?? people[0], shownStatus = statusOf(shown.id);
  const profile: Profile = {
    kicker: `${shown.id === "guest" ? "VISITOR" : "EMPLOYEE FILE"} · ${shown.coat} · ${shown.file}`, name: shown.name, role: shown.role, badge: shownStatus.label, tone: shownStatus.tone,
    body: <>いまいる場所：{plan.rooms[shownStatus.room].name}<br/>{shownStatus.job}</>,
  };
  // Hit box and name tag over a cat sprite whose top-left is (x, y).
  const pick = (id: string, x: number, y: number, h = 46) => <>
    {shown.id === id && <NameTag x={x + 21} y={y + h} name={nameOf(id)}/>}
    <Hit x={x + 3} y={y} w={36} h={h} label={`${nameOf(id)}、${statusOf(id).label}`} pressed={shown.id === id} onSelect={() => setSelected(id)}/>
  </>;

  // A cat in a chair: the pose is drawn so its bottom edge sits where a 50px resting body would.
  const seated = (id: string, sprite: string, pose: CatPose, body: Point, order: number, flip = false, duration = 2.4) => {
    const size = catSprite(sprite, pose), y = body.y + 50 - size.h;
    return <>
      <CatSprite id={sprite} pose={pose} x={body.x} y={y} z={order} flip={flip} duration={duration}/>
      {pose === "work" && <CatSprite id={sprite} pose="blink" x={body.x} y={y} z={order} flip={flip} className={styles.blink}/>}
      {pick(id, body.x, y, size.h)}
    </>;
  };

  // Everyone who walks around: staff and the visitor.
  const walkers = ACTORS.filter(id => id !== "guest" || !guestGone).map(id => {
    const actor = sim.actors[id], sprite = id === "guest" ? guest.id : id;
    if (!actor.seat) {
      const p = ground(actor.pos), next = actor.path[0], dx = next ? (next.x - actor.pos.x) - (next.y - actor.pos.y) : 0;
      const layer = walkerLayer(actor.pos), x = p.x - 22, y = p.y - 40 - layer.lift;
      return <div key={id} className={styles.seat}><CatSprite id={sprite} pose="walk" x={x} y={y} z={layer.z} flip={dx < 0} duration={0.6}/>{pick(id, x, y, 42)}</div>;
    }
    const spot = SPOTS[actor.seat];
    if (spot.kind === "stand") {
      const p = ground(spot.at), x = p.x - 22, y = p.y - 40, faceLeft = spot.id === "counter";
      return <div key={id} className={styles.seat}><CatSprite id={sprite} pose="stand" x={x} y={y} z={depth(spot.at.x, spot.at.y) + 1} flip={faceLeft}/>{pick(id, x, y, 42)}</div>;
    }
    if (spot.kind === "sofa") {
      const p = screen(spot.at.x, spot.at.y, SEAT_Z), pose = SOFA_POSES[spot.id], x = p.x - 21, y = p.y - 36;
      return <div key={id} className={styles.seat}><CatSprite id={sprite} pose={pose.pose} x={x} y={y} z={seatOrder(spot.id)} duration={pose.duration}/>{pick(id, x, y)}</div>;
    }
    return null;
  });
  // Chairs are furniture; the cat (if any) sitting in each one is drawn inside it.
  const sitter = (spot: string) => ACTORS.find(id => sim.actors[id].seat === spot && (id !== "guest" || !guestGone));
  const chairCat = (spot: string, body: Point, order: number) => {
    const id = sitter(spot);
    if (!id) return null;
    if (id === "guest") return seated(id, guest.id, "side-read", body, order, spot === "seat-4", 2.2);
    if (MEETING_SEATS.includes(spot)) return seated(id, id, spot === "seat-2" ? "front-speak" : "front-nod", body, order, false, spot === "seat-2" ? 0.4 : 1.2);
    return seated(id, id, "rest", body, order);
  };

  const chairs = Object.values(SPOTS).filter(s => s.kind === "chair");
  const beanbag = SPOTS.beanbag, bean = ground(beanbag.at), beanOrder = depth(beanbag.at.x, beanbag.at.y);
  const host = point(plan.seats.host), hostAt = ground(host);
  const duties = dutiesAt(tasks, sim.t), count = (...kinds: Duty[]) => STAFF.filter(s => kinds.includes(duties[s.id])).length;

  return <section className={styles.suite} aria-label="全体マップ">
    <div className={styles.toolbar}>
      <span><i className={styles.status}/> {department} <b>OFFICE MAP · 3/4 VIEW</b></span>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶ 再生" : "Ⅱ 一時停止"}</button>
    </div>
    <div className={styles.mapFrame} style={backdrop(scale)} ref={frame} tabIndex={0} aria-label="オフィス全体のようす。狭い画面では左右にスクロールできます">
      <div className={`${styles.stage} ${paused ? styles.paused : ""}`} style={{ "--px": scale, "--stage-w": W, "--stage-h": H } as CSSProperties}>
        <Sprite src={`${ART}building.png`} x={0} y={0} w={W} h={H} z={0}/>
        {/* Low walls and glass, cut into short depth-sorted pieces so cats pass in front of or behind them */}
        {ART_META.walls.map(({ poly, depth: d }, i) => <span key={i} aria-hidden="true" className={styles.sprite} style={{ ...at(0, 0, { "--w": W, "--h": H, "--z": Math.round(d * 3) + 10, "--frames": 1 }), backgroundImage: `url(${ART}walls.png)`, clipPath: `polygon(${poly.map(([x, y]) => `${(x / W) * 100}% ${(y / H) * 100}%`).join(",")})` }}/>)}
        {plan.props.map(({ id, kind, u, v }) => <Piece key={id} kind={kind as Kind} u={u} v={v}/>)}

        {/* President's suite: the same long desk for two as the suite screen (typing at work, dozing off duty) */}
        <ExecutiveDesk modes={EXECUTIVES.map(e => (working(e.cat) ? "work" : "rest"))} at={EXEC_AT} z={depth(EXEC.u, EXEC.v)} delays={EXECUTIVES.map(e => offsetOf(e.id))}>
          {(seat, index, shift) => { const body = shift(seat.body); return pick(EXECUTIVES[index].id, body.x, body.y + 2, 46); }}
        </ExecutiveDesk>

        {/* Egg chairs (meeting room, waiting area, lounge) */}
        {chairs.map(s => <div key={s.id} className={styles.seat}><EggChair spot={s.at}>{(body, order) => chairCat(s.id, body, order)}</EggChair></div>)}

        {/* Work studio: one computer station per staff cat */}
        {Object.values(SPOTS).filter(s => s.kind === "station").map(s => {
          const id = sitter(s.id);
          return <div key={s.id} className={styles.seat}><Station spot={s.at} cat={id}>{box => id && pick(id, box.x + 6, box.y + 4, 46)}</Station></div>;
        })}

        {/* Lounge: sofa and beanbag */}
        <Piece kind="sofa-back" u={SOFA.u} v={SOFA.v} order={SOFA_ORDER}/>
        <Piece kind="sofa-front" u={SOFA.u} v={SOFA.v} order={SOFA_FRONT}/>
        <Sprite src={`${BEANBAG}back.png`} x={bean.x - 23} y={bean.y - 26} w={46} h={28} z={beanOrder}/>
        {(() => { const id = sitter("beanbag"); return id && <><CatSprite id={id} pose="rest" x={bean.x - 23} y={bean.y - 57} z={beanOrder + 1} duration={2.8}/>{pick(id, bean.x - 23, bean.y - 57, 50)}</>; })()}
        <Sprite src={`${BEANBAG}front.png`} x={bean.x - 23} y={bean.y - 26} w={46} h={28} z={beanOrder + 2}/>

        {/* Reception: きなこ behind the counter */}
        <CatSprite id={HOST.id} pose={hostTalking ? "front-speak" : "front-read"} x={hostAt.x - 21} y={hostAt.y - 44} z={depth(host.x, host.y)} duration={hostTalking ? 0.5 : 2.2}/>
        {pick(HOST.id, hostAt.x - 21, hostAt.y - 44)}

        {walkers}

        {(Object.keys(plan.rooms) as RoomId[]).map(id => {
          const r = plan.rooms[id], corners = [[r.u, r.v], [r.u + r.du, r.v], [r.u + r.du, r.v + r.dv], [r.u, r.v + r.dv]].map(([u, v]) => screen(u, v, r.z));
          const x0 = Math.min(...corners.map(c => c.x)), y0 = Math.min(...corners.map(c => c.y)), w = Math.max(...corners.map(c => c.x)) - x0, h = Math.max(...corners.map(c => c.y)) - y0;
          // Keep the lounge label on the lawn in front; its center is occupied by the sofa and table.
          const label = screen(r.u + r.du / 2, id === "lounge" ? r.v + r.dv + 24 : r.v + r.dv / 2, r.z);
          return <div key={id} className={styles.room} style={at(0, 0)}>
            <button type="button" className={styles.roomArea} style={{ ...at(x0, y0, { "--w": w, "--h": h }), clipPath: `polygon(${corners.map(c => `${((c.x - x0) / w) * 100}% ${((c.y - y0) / h) * 100}%`).join(",")})` }} onClick={() => onOpenRoom(id)} aria-label={`${r.name}の詳細画面を開く`}/>
            <span className={styles.roomTag} style={at(label.x, label.y)} aria-hidden="true">{r.name} ›</span>
          </div>;
        })}
      </div>
    </div>
    <p className={styles.agenda}><b>猫脳社オフィス</b> 作業中 {count("work", "coffee")} · 会議中 {count("meeting")} · 休憩中 {count("rest")} · 来客：{guestGone ? "なし" : guest.name}<span className={styles.hint}>部屋をクリックすると詳細画面に切り替わります。猫をクリックするとプロフィールを表示します。</span></p>
    <ProfilePanel selected={shown.id} onSelect={setSelected} profile={profile} members={people.map(p => ({ id: p.id, name: p.name, label: statusOf(p.id).label }))}/>
  </section>;
}
