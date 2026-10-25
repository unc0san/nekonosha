"use client";

import { useEffect, useState, type CSSProperties } from "react";
import sceneData from "./work-studio.json";
import styles from "./office-stage.module.css";
import { Sprite, useStageScale, type Point } from "./stage";

type OfficeTask = { title: string; owner: string; done: boolean };
type Prop = { id: string; src: string; x: number; y: number; w: number; h: number; base: number; frames?: number; duration?: number; effect?: "glow" };
type Staff = { id: string; name: string; coat: string; role: string };
type Desk = { staff: string; chair: Point; labels: Record<string, string> };
type LoungeSpot = { id: string; kind: "chair" | "beanbag"; chair: Point; stand: Point };
type Layout = Record<"body" | "tail" | "table" | "laptop" | "stand" | "pendant" | "glow", Point>;
type Scene = { stage: { width: number; height: number }; aisleY: number; entrance: Point; seatLayout: Layout; props: Prop[]; staff: Staff[]; desks: Desk[]; lounge: LoungeSpot[] };

type Spot = { id: string; kind: "desk" | LoungeSpot["kind"]; chair: Point; stand: Point; flip: boolean };
type Plan = { task?: OfficeTask; spot: string; mode: "work" | "rest" };
// `seat` is set while sitting; otherwise the cat walks along `path` toward `dest`.
type Actor = { pos: Point; path: Point[]; seat: string | null; dest: string; heading: 1 | -1; wait: number; stroll: boolean };

const scene = sceneData as Scene;
const L = scene.seatLayout;
const ROOT = "/office/";
const SPEED = 40; // stage pixels per second
const TICK = 80;
const STROLL_EVERY = 14000;

const spots: Spot[] = [
  ...scene.desks.map(desk => ({ id: `desk:${desk.staff}`, kind: "desk" as const, chair: desk.chair, stand: { x: desk.chair.x + L.stand.x, y: desk.chair.y + L.stand.y }, flip: false })),
  ...scene.lounge.map(spot => ({ id: spot.id, kind: spot.kind, chair: spot.chair, stand: spot.stand, flip: true })),
];
const spotById = Object.fromEntries(spots.map(spot => [spot.id, spot]));
const baseOf = (spot: Spot) => spot.chair.y + (spot.kind === "beanbag" ? 26 : 66);

// Tasks are shared round-robin across the five staff; anyone without open work heads for the lounge.
// Cats already resting in the lounge keep their spot (`held`), so finishing a task never reshuffles the others.
function planFor(tasks: OfficeTask[], held: Record<string, string> = {}): Record<string, Plan> {
  const open: Record<string, OfficeTask[]> = {};
  tasks.forEach((task, index) => { if (!task.done) (open[scene.staff[index % scene.staff.length].id] ??= []).push(task); });
  const resting = scene.staff.filter(({ id }) => !open[id]).map(({ id }) => id);
  const keep = Object.fromEntries(resting.filter(id => held[id] && !held[id].startsWith("desk:")).map(id => [id, held[id]]));
  const free = scene.lounge.map(spot => spot.id).filter(spot => !Object.values(keep).includes(spot));
  return Object.fromEntries(scene.staff.map(({ id }) => {
    const task = open[id]?.[0];
    if (task) return [id, { task, spot: `desk:${id}`, mode: "work" }];
    return [id, { spot: keep[id] ?? free.shift() ?? `desk:${id}`, mode: "rest" }];
  }));
}

// Walk down to the aisle, along it, then up to the destination.
function route(from: Point, to: Point): Point[] {
  const points = [{ x: from.x, y: scene.aisleY }, { x: to.x, y: scene.aisleY }, to];
  return points.filter((point, i) => { const prev = i ? points[i - 1] : from; return point.x !== prev.x || point.y !== prev.y; });
}

function step(actors: Record<string, Actor>, dt: number): Record<string, Actor> {
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

export default function WorkStudio({ department, tasks }: { department: string; tasks: OfficeTask[] }) {
  const { width, height } = scene.stage;
  const { frame, scale } = useStageScale(width);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(scene.staff[0].id);
  // Everyone clocks in from the entrance on first load.
  const [actors, setActors] = useState<Record<string, Actor>>(() => Object.fromEntries(scene.staff.map(({ id }, index) => {
    const dest = planFor(tasks)[id].spot;
    return [id, { pos: scene.entrance, path: route(scene.entrance, spotById[dest].stand), seat: null, dest, heading: 1, wait: index * 900, stroll: false }];
  })));
  const plans = planFor(tasks, Object.fromEntries(Object.entries(actors).map(([id, actor]) => [id, actor.dest])));

  // Re-route cats whose destination changed because a task was completed, reopened or added.
  const destinations = scene.staff.map(({ id }) => plans[id].spot).join("|");
  useEffect(() => {
    const dests = destinations.split("|");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- movement state follows the task list
    setActors(previous => Object.fromEntries(scene.staff.map(({ id }, index) => {
      const actor = previous[id], dest = dests[index];
      if (actor.dest === dest && !actor.stroll) return [id, actor];
      const from = actor.seat ? spotById[actor.seat].stand : actor.pos;
      return [id, { ...actor, pos: from, path: route(from, spotById[dest].stand), seat: null, dest, stroll: false }];
    })));
  }, [destinations]);

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sinceStroll = 0;
    const timer = window.setInterval(() => {
      // With reduced motion, cats skip walking and appear straight at their seats.
      if (reduced) {
        setActors(previous => Object.values(previous).every(actor => actor.seat) ? previous : Object.fromEntries(Object.entries(previous).map(([id, actor]) => [id, { ...actor, pos: spotById[actor.dest].stand, path: [], seat: actor.dest, stroll: false }])));
        return;
      }
      sinceStroll += TICK;
      setActors(previous => {
        let next = step(previous, TICK / 1000);
        if (sinceStroll < STROLL_EVERY) return next;
        sinceStroll = 0;
        // A lounging cat occasionally stretches its legs along the aisle and comes back.
        const idle = Object.entries(next).filter(([, actor]) => actor.seat && spotById[actor.seat].kind !== "desk");
        if (!idle.length) return next;
        const [id, actor] = idle[Math.floor(Math.random() * idle.length)];
        const home = spotById[actor.seat as string].stand, turn = { x: 40 + Math.random() * 200, y: scene.aisleY };
        next = { ...next, [id]: { ...actor, pos: home, path: [...route(home, turn), ...route(turn, home)], seat: null, stroll: true } };
        return next;
      });
    }, TICK);
    return () => window.clearInterval(timer);
  }, [paused]);

  const status = (id: string) => {
    const actor = actors[id], plan = plans[id];
    if (!actor.seat) return { mode: "walk" as const, label: "移動中", job: actor.stroll ? "ちょっとお散歩中。すぐ戻ります。" : plan.mode === "work" ? `デスクへ向かっています：${plan.task?.title}` : "ラウンジへ向かっています。" };
    if (plan.mode === "work") return { mode: "work" as const, label: "作業中", job: `サポート中：${plan.task?.title}` };
    return { mode: "rest" as const, label: "休憩中", job: spotById[actor.seat].kind === "desk" ? "担当タスクが完了。デスクでうとうとしています。" : "担当タスクが完了。ラウンジでひと休みしています。" };
  };

  const deskOf = (id: string) => scene.desks.find(desk => desk.staff === id) as Desk;
  const current = scene.staff.find(member => member.id === selected) as Staff;
  const currentStatus = status(selected);

  return <section className={styles.suite} aria-label="作業スペース（試作）">
    <div className={styles.toolbar}>
      <span><i className={styles.status}/> {department} <b>WORK STUDIO · PROTOTYPE</b></span>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶ 再生" : "Ⅱ 一時停止"}</button>
    </div>
    <div className={styles.frame} ref={frame} tabIndex={0} aria-label="作業スペースのようす。狭い画面では左右にスクロールできます">
      <div className={`${styles.stage} ${paused ? styles.paused : ""}`} style={{ "--px": scale, "--stage-w": width, "--stage-h": height } as CSSProperties}>
        {scene.props.map(({ id, src, base, effect, ...prop }) => <Sprite key={id} src={ROOT + src} z={base * 10} {...prop} className={effect === "glow" ? styles.glow : ""}/>)}

        {scene.desks.map(desk => {
          const { x, y } = desk.chair, z = (y + 66) * 10;
          return <div key={desk.staff} className={styles.seat}>
            <Sprite src={`${ROOT}studio/lights/pendant-glow.png`} x={x + L.glow.x} y={y + L.glow.y} w={48} h={40} z={4} className={styles.glow}/>
            <Sprite src={`${ROOT}studio/lights/pendant.png`} x={x + L.pendant.x} y={L.pendant.y} w={14} h={26} z={5}/>
            <Sprite src={`${ROOT}president/furniture/egg-chair-back.png`} x={x} y={y} w={56} h={68} z={z}/>
            <Sprite src={`${ROOT}studio/furniture/side-table.png`} x={x + L.table.x} y={y + L.table.y} w={30} h={40} z={z + 1}/>
            <Sprite src={`${ROOT}president/furniture/egg-chair-front.png`} x={x} y={y} w={56} h={68} z={z + 3}/>
            <Sprite src={`${ROOT}president/furniture/laptop.png`} x={x + L.laptop.x} y={y + L.laptop.y} w={20} h={16} z={z + 5}/>
            <span className={styles.label} style={{ "--x": x + 30, "--y": 45 } as CSSProperties} aria-hidden="true">{desk.labels[department] ?? Object.values(desk.labels)[0]}</span>
          </div>;
        })}

        {scene.lounge.map(spot => {
          const z = baseOf(spotById[spot.id]) * 10, file = spot.kind === "chair" ? "president/furniture/egg-chair" : "studio/furniture/beanbag", [w, h] = spot.kind === "chair" ? [56, 68] : [46, 28];
          return <div key={spot.id} className={styles.seat}>
            <Sprite src={`${ROOT}${file}-back.png`} {...spot.chair} w={w} h={h} z={z} flip={spot.kind === "chair"}/>
            <Sprite src={`${ROOT}${file}-front.png`} {...spot.chair} w={w} h={h} z={z + 3} flip={spot.kind === "chair"}/>
          </div>;
        })}

        {scene.staff.map(({ id, name }, index) => {
          const actor = actors[id], state = status(id), isSelected = selected === id;
          const select = <button type="button" className={styles.hit} aria-pressed={isSelected} aria-label={`${name}、${state.label}`} onClick={() => setSelected(id)}
            style={(actor.seat ? { "--x": spotById[actor.seat].chair.x, "--y": spotById[actor.seat].chair.y - 4, "--w": 56, "--h": 66 } : { "--x": Math.round(actor.pos.x) - 20, "--y": Math.round(actor.pos.y) - 40, "--w": 44, "--h": 42 }) as CSSProperties}/>;
          if (!actor.seat) {
            const x = Math.round(actor.pos.x) - 20, y = Math.round(actor.pos.y) - 40;
            return <div key={id} className={`${styles.seat} ${isSelected ? styles.selected : ""}`}>
              <Sprite src={`${ROOT}studio/cats/${id}-walk.png`} x={x} y={y} w={44} h={42} z={Math.round(actor.pos.y) * 10 + 5} frames={4} duration={0.6} flip={actor.heading < 0}/>
              {isSelected && <span className={styles.nameTag} style={{ "--x": x + 22, "--y": y + 42 } as CSSProperties} aria-hidden="true">{name}</span>}
              {select}
            </div>;
          }
          const spot = spotById[actor.seat], z = baseOf(spot) * 10, rest = state.mode === "rest";
          const body = spot.kind === "beanbag" ? { x: spot.chair.x, y: spot.chair.y - 31 } : { x: spot.flip ? spot.chair.x + 56 - L.body.x - 42 : spot.chair.x + L.body.x, y: spot.chair.y + L.body.y };
          const tail = { x: spot.flip ? spot.chair.x + 56 - L.tail.x - 16 : spot.chair.x + L.tail.x, y: spot.chair.y + L.tail.y };
          return <div key={id} className={`${styles.seat} ${rest ? styles.resting : ""} ${isSelected ? styles.selected : ""}`}>
            <Sprite src={`${ROOT}studio/cats/${id}-${rest ? "rest" : "work"}.png`} {...body} w={42} h={50} z={z + 2} frames={2} duration={rest ? 2.4 : 0.5} flip={spot.flip}/>
            {!rest && <Sprite src={`${ROOT}studio/cats/${id}-blink.png`} {...body} w={42} h={50} z={z + 2} flip={spot.flip} className={`${styles.blink} ${index % 2 ? styles.blinkLate : ""}`}/>}
            {spot.kind !== "beanbag" && <Sprite src={`${ROOT}studio/cats/${id}-tail.png`} {...tail} w={16} h={16} z={z + 4} frames={4} duration={rest ? 4.8 : 2.4} flip={spot.flip}/>}
            <span className={styles.bubble} style={{ "--x": body.x + 21, "--y": body.y + 2 } as CSSProperties} aria-hidden="true">{rest ? "z Z" : <><i/><i/><i/></>}</span>
            {isSelected && <span className={styles.nameTag} style={{ "--x": spot.stand.x, "--y": baseOf(spot) + 2 } as CSSProperties} aria-hidden="true">{name}</span>}
            {select}
          </div>;
        })}
      </div>
    </div>
    <div className={styles.roster} role="group" aria-label="猫社員を選択">
      {scene.staff.map(({ id, name }) => <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>{name}<small>{status(id).label}</small></button>)}
    </div>
    <div className={styles.card} aria-live="polite">
      <div><span className={styles.kicker}>EMPLOYEE FILE · {current.coat} · {deskOf(selected).labels[department] ?? ""}</span><h3>{current.name}<small>{current.role}</small></h3></div>
      <p>{currentStatus.job}</p>
      <span className={`${styles.badge} ${currentStatus.mode === "rest" ? styles.badgeRest : currentStatus.mode === "walk" ? styles.badgeWalk : ""}`}>{currentStatus.label}</span>
    </div>
  </section>;
}
