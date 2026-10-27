"use client";

import { useEffect, useState, type CSSProperties } from "react";
import sceneData from "./work-studio.json";
import styles from "./office-stage.module.css";
import { Sprite, useStageScale, type Point } from "./stage";
import { LaptopDesk } from "./area-stage";
import { openTasksByStaff, type OfficeTask } from "./staff";
import { dutiesAt, officeNow, officeTime, type Duty } from "./office-schedule";
import { TICK, route as walkRoute, step, type Actor } from "./movement";

type Prop = { id: string; src: string; x: number; y: number; w: number; h: number; base: number; frames?: number; duration?: number; effect?: "glow" };
type Staff = { id: string; name: string; coat: string; role: string };
type Desk = { staff: string; chair: Point; labels: Record<string, string> };
type LoungeSpot = { id: string; kind: "chair" | "beanbag"; chair: Point; stand: Point };
type Layout = Record<"body" | "tail" | "table" | "laptop" | "stand" | "pendant" | "glow", Point>;
type Scene = { stage: { width: number; height: number }; aisleY: number; entrance: Point; seatLayout: Layout; props: Prop[]; staff: Staff[]; desks: Desk[]; lounge: LoungeSpot[] };

type Spot = { id: string; kind: "desk" | LoungeSpot["kind"]; chair: Point; stand: Point; flip: boolean };
type Plan = { task?: OfficeTask; spot: string; mode: "work" | "away"; duty: Duty };

const scene = sceneData as Scene;
const L = scene.seatLayout;
const ROOT = "/office/";
// Cats who are not working here (resting in the lounge, at the coffee machine, in a meeting) leave by the entrance.
const AWAY = "away";

const spots: Spot[] = [
  ...scene.desks.map(desk => ({ id: `desk:${desk.staff}`, kind: "desk" as const, chair: desk.chair, stand: { x: desk.chair.x + L.stand.x, y: desk.chair.y + L.stand.y }, flip: false })),
  ...scene.lounge.map(spot => ({ id: spot.id, kind: spot.kind, chair: spot.chair, stand: spot.stand, flip: true })),
];
const spotById: Record<string, Spot> = Object.fromEntries(spots.map(spot => [spot.id, spot]));
const standOf = (id: string) => (id === AWAY ? scene.entrance : spotById[id].stand);
const baseOf = (spot: Spot) => spot.chair.y + (spot.kind === "beanbag" ? 26 : 66);

// Tasks are shared round-robin across the five staff. The office schedule decides who is at a desk right now: a cat
// with open work types at its desk unless it is in a meeting or on a coffee break; everyone else is away.
function planFor(tasks: OfficeTask[], t: number): Record<string, Plan> {
  const open = openTasksByStaff(tasks), duties = dutiesAt(tasks, t);
  return Object.fromEntries(scene.staff.map(({ id }) => [id, duties[id] === "work" ? { task: open[id]?.[0], spot: `desk:${id}`, mode: "work", duty: duties[id] } : { task: open[id]?.[0], spot: AWAY, mode: "away", duty: duties[id] }]));
}

const route = (from: Point, to: Point) => walkRoute(from, to, scene.aisleY);

export default function WorkStudio({ department, tasks }: { department: string; tasks: OfficeTask[] }) {
  const { width, height } = scene.stage;
  const { frame, scale } = useStageScale(width);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(scene.staff[0].id);
  // Everyone starts where the office schedule has them right now (in step with the map and the other rooms).
  const [now, setNow] = useState(officeNow);
  const [actors, setActors] = useState<Record<string, Actor>>(() => Object.fromEntries(scene.staff.map(({ id }) => {
    const dest = planFor(tasks, now)[id].spot;
    return [id, { pos: standOf(dest), path: [], seat: dest, dest, heading: 1, wait: 0, stroll: false }];
  })));
  const plans = planFor(tasks, now);

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => {
      const t = officeTime(), plan = planFor(tasks, t);
      setNow(t);
      // Cats parked somewhere other than where the schedule wants them set off; a walk in progress finishes first.
      // With reduced motion, cats skip walking and appear straight at their seats.
      setActors(previous => {
        let next = step(previous, TICK / 1000);
        for (const [id, actor] of Object.entries(next)) {
          const dest = plan[id].spot;
          if (!actor.seat || actor.dest === dest) continue;
          const from = standOf(actor.seat);
          next = { ...next, [id]: { ...actor, pos: from, path: route(from, standOf(dest)), seat: null, dest, wait: 0 } };
        }
        if (reduced) next = Object.fromEntries(Object.entries(next).map(([id, actor]) => [id, actor.seat ? actor : { ...actor, pos: standOf(actor.dest), path: [], seat: actor.dest }]));
        return next;
      });
    }, TICK);
    return () => window.clearInterval(timer);
  }, [paused, tasks]);

  const AWAY_STATUS: Record<Duty, { label: string; job: string }> = {
    rest: { label: "休憩中", job: "担当タスクが完了。ラウンジでひと休みしています。" },
    coffee: { label: "コーヒー休憩", job: "ラウンジのコーヒーマシンでひと息ついています。すぐ戻ります。" },
    meeting: { label: "会議中", job: "会議室で打ち合わせをしています。" },
    work: { label: "作業中", job: "" },
  };
  const status = (id: string) => {
    const actor = actors[id], plan = plans[id];
    if (!actor.seat) return { mode: "walk" as const, label: "移動中", job: actor.dest === AWAY ? (plan.duty === "meeting" ? "会議室へ向かっています。" : "ラウンジへ向かっています。") : `デスクへ向かっています：${plan.task?.title}` };
    if (actor.seat === AWAY) return { mode: "rest" as const, ...AWAY_STATUS[plan.duty] };
    if (plan.task?.request) return { mode: "work" as const, label: "依頼対応中", job: `ぽんず経由の依頼に集中しています：${plan.task.title}（終わったら成果物を提出します）` };
    return { mode: "work" as const, label: "作業中", job: `ノートパソコンで作業中：${plan.task?.title ?? "担当タスク"}` };
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
            {!(actors[desk.staff].seat === `desk:${desk.staff}`) && <LaptopDesk spot={{ x: x + L.laptop.x, y: y + L.laptop.y }} side="left" z={z + 5}/>}
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
          // Away (lounge, coffee, meeting): not in this room.
          if (actor.seat === AWAY) return null;
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
          // At the desk: turned to the laptop, typing (the laptop is drawn with the cat so their animations line up).
          if (spot.kind === "desk") return <div key={id} className={`${styles.seat} ${isSelected ? styles.selected : ""}`}>
            <LaptopDesk id={id} spot={{ x: spot.chair.x + L.laptop.x, y: spot.chair.y + L.laptop.y }} side="left" z={z + 2} delay={-((index * 1.7) % 4.8)}/>
            <span className={styles.bubble} style={{ "--x": spot.chair.x + 30, "--y": spot.chair.y } as CSSProperties} aria-hidden="true"><i/><i/><i/></span>
            {isSelected && <span className={styles.nameTag} style={{ "--x": spot.stand.x, "--y": baseOf(spot) + 2 } as CSSProperties} aria-hidden="true">{name}</span>}
            {select}
          </div>;
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
