"use client";

import { useEffect, useState } from "react";
import sceneData from "./lounge.json";
import styles from "./office-stage.module.css";
import { AreaStage, BeanbagCat, CatSprite, ChairCat, Hit, NameTag, ProfilePanel, Speech, type Profile } from "./area-stage";
import { DOOR, areaIndex, depth, type Area } from "./area";
import { TICK, sendTo, step, type Actor } from "./movement";
import { STAFF, deskLabel, openTasksByStaff, type OfficeTask } from "./staff";
import { dutiesAt, officeNow, officeTime } from "./office-schedule";
import type { CatPose } from "./cat-sprites";
import { Sprite, type Point } from "./stage";

type Scene = Area & { steam: Point; chatter: string[] };
type Activity = "chat" | "listen" | "sip" | "doze";

const scene = sceneData as Scene;
const { spots, pointOf } = areaIndex(scene);
// Cats with open tasks are away at their desks, which sit behind the studio door.
const DESKS = `${DOOR}studio`;
const REST_SPOTS = ["sofa-1", "sofa-2", "sofa-3", "chair", "beanbag"];
const SOFA = REST_SPOTS.slice(0, 3);
const BEAT = 5000;
const ACTIVITY: Record<Activity, { pose: CatPose; label: string; duration: number }> = {
  chat: { pose: "front-speak", label: "おしゃべり中", duration: 0.4 },
  listen: { pose: "front-nod", label: "相づち中", duration: 1.2 },
  sip: { pose: "front-sip", label: "コーヒータイム", duration: 2.4 },
  doze: { pose: "front-doze", label: "うたた寝中", duration: 3.2 },
};

// The office schedule decides who is here: anyone without open work rests (keeping their seat, `held`), and the cat
// on a coffee break comes over from the desks. Everyone else is at a desk or in a meeting, behind the studio door.
function planFor(tasks: OfficeTask[], t: number, held: Record<string, string> = {}): Record<string, string> {
  const duties = dutiesAt(tasks, t);
  const keep = Object.fromEntries(STAFF.filter(({ id }) => duties[id] === "rest" && REST_SPOTS.includes(held[id])).map(({ id }) => [id, held[id]]));
  const free = REST_SPOTS.filter(spot => !Object.values(keep).includes(spot));
  return Object.fromEntries(STAFF.map(({ id }) => [id, duties[id] === "coffee" ? "coffee" : duties[id] === "rest" ? keep[id] ?? free.shift() ?? DESKS : DESKS]));
}

function snap(actors: Record<string, Actor>) {
  if (Object.values(actors).every(actor => actor.seat)) return actors;
  return Object.fromEntries(Object.entries(actors).map(([id, actor]) => [id, actor.seat ? actor : { ...actor, pos: pointOf(actor.dest), path: [], seat: actor.dest, wait: 0 }]));
}

export default function Lounge({ department, tasks }: { department: string; tasks: OfficeTask[] }) {
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(STAFF[0].id);
  const [beat, setBeat] = useState(0);
  // Everyone starts where the office schedule has them right now (in step with the map and the other rooms).
  const [now, setNow] = useState(officeNow);
  const [actors, setActors] = useState<Record<string, Actor>>(() => {
    const plan = planFor(tasks, now);
    return Object.fromEntries(STAFF.map(({ id }) => [id, { pos: pointOf(plan[id]), path: [], seat: plan[id], dest: plan[id], heading: -1, wait: 0, stroll: false }]));
  });

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sinceBeat = 0;
    const timer = window.setInterval(() => {
      sinceBeat += TICK;
      if (sinceBeat >= BEAT) { sinceBeat = 0; setBeat(value => value + 1); }
      const t = officeTime();
      setNow(t);
      // Finishing or reopening a task, a coffee break or a meeting sends cats between the studio and the lounge.
      // A cat finishes its current walk before turning around.
      setActors(previous => {
        let next = step(previous, TICK / 1000);
        const plan = planFor(tasks, t, Object.fromEntries(Object.entries(next).map(([id, actor]) => [id, actor.dest])));
        for (const [id, actor] of Object.entries(next)) {
          if (!actor.seat || actor.dest === plan[id]) continue;
          next = { ...next, [id]: sendTo(actor, pointOf(actor.seat), plan[id], pointOf(plan[id]), scene.walkY) };
        }
        return reduced ? snap(next) : next;
      });
    }, TICK);
    return () => window.clearInterval(timer);
  }, [paused, tasks]);

  const open = openTasksByStaff(tasks);
  // Sofa cats take turns: one talks, the next one nods along, the others sip or doze.
  const onSofa = SOFA.map(spot => STAFF.find(({ id }) => actors[id].seat === spot)?.id).filter((id): id is string => !!id);
  const activityOf = (id: string): Activity => {
    const i = onSofa.indexOf(id), n = onSofa.length;
    if (n >= 2 && i === beat % n) return "chat";
    if (n >= 2 && i === (beat + 1) % n) return "listen";
    return (beat + i) % 2 ? "sip" : "doze";
  };
  const chatLine = scene.chatter[beat % scene.chatter.length];

  const duties = dutiesAt(tasks, now);
  const status = (id: string): { label: string; job: string; tone?: "rest" | "walk" } => {
    const actor = actors[id];
    if (!actor.seat) return { label: "移動中", tone: "walk", job: actor.dest === "coffee" ? "コーヒーを淹れにきました。" : actor.dest === DESKS ? "ワークスペースのデスクへ戻ります。" : "ひと休みしにラウンジへ。" };
    if (actor.seat === DESKS) return duties[id] === "meeting" ? { label: "会議中", job: "会議室で打ち合わせをしています。" } : { label: "作業中", job: "ワークスペースのデスクで作業しています。" };
    if (actor.seat === "coffee") return { label: "コーヒー休憩", tone: "rest", job: "コーヒーマシンで一杯淹れています。" };
    if (SOFA.includes(actor.seat)) { const a = activityOf(id); return { label: ACTIVITY[a].label, tone: "rest", job: a === "chat" ? `「${chatLine}」` : "ソファでくつろいでいます。" }; }
    return { label: "ひと休み中", tone: "rest", job: "担当分が片づいたので、のんびり休憩中。" };
  };

  const resting = STAFF.filter(({ id }) => REST_SPOTS.includes(actors[id].seat ?? "")).length;
  const working = STAFF.filter(({ id }) => actors[id].seat === DESKS && duties[id] !== "meeting").length;
  const meeting = STAFF.filter(({ id }) => actors[id].seat === DESKS && duties[id] === "meeting").length;
  const brewing = Object.values(actors).some(actor => actor.seat === "coffee");
  const current = STAFF.find(({ id }) => id === selected) ?? STAFF[0], currentStatus = status(current.id);
  const profile: Profile = {
    kicker: `EMPLOYEE FILE · ${current.coat} · ${deskLabel(current.id, department)}`, name: current.name, role: current.role, badge: currentStatus.label, tone: currentStatus.tone,
    body: <>担当タスク：{open[current.id]?.[0]?.title ?? "なし（担当分は完了しています）"}<br/>{currentStatus.job}</>,
  };

  return <section className={styles.suite} aria-label="ラウンジ（試作）">
    <AreaStage area={scene} department={department} code="LOUNGE" paused={paused} onPause={() => setPaused(!paused)}>
      {brewing && <Sprite src="/office/lounge/furniture/steam.png" {...scene.steam} w={12} h={16} z={depth(132)} frames={3} duration={1.2}/>}
      {!STAFF.some(({ id }) => actors[id].seat === "chair") && <ChairCat chair={spots.chair.chair as Point} flip={spots.chair.flip}/>}
      {!STAFF.some(({ id }) => actors[id].seat === "beanbag") && <BeanbagCat chair={spots.beanbag.chair as Point}/>}
      {STAFF.map(({ id, name }) => {
        const actor = actors[id], isSelected = selected === id, { label } = status(id);
        const select = (box: Point & { w: number; h: number }) => <>
          {isSelected && <NameTag x={box.x + box.w / 2} y={box.y + box.h} name={name}/>}
          <Hit {...box} label={`${name}、${label}`} pressed={isSelected} onSelect={() => setSelected(id)}/>
        </>;
        if (actor.seat === DESKS) return null;
        if (!actor.seat || actor.seat === "coffee") {
          const x = Math.round(actor.pos.x) - 20, y = Math.round(actor.pos.y) - 40, standing = actor.seat === "coffee";
          return <div key={id} className={styles.seat}>
            <CatSprite id={id} pose={standing ? "stand" : "walk"} x={x} y={y} z={depth(Math.round(actor.pos.y)) + 5} flip={standing ? spots.coffee.facing === -1 : actor.heading < 0} duration={0.6}/>
            {select({ x, y, w: 44, h: 42 })}
          </div>;
        }
        const spot = spots[actor.seat], chair = spot.chair as Point;
        if (spot.kind === "chair") return <div key={id} className={styles.seat}><ChairCat id={id} chair={chair} flip={spot.flip}/>{select({ x: chair.x, y: chair.y - 4, w: 56, h: 66 })}</div>;
        if (spot.kind === "beanbag") return <div key={id} className={styles.seat}><BeanbagCat id={id} chair={chair} flip={spot.flip}/>{select({ x: chair.x, y: chair.y - 31, w: 46, h: 58 })}</div>;
        const body = spot.body as Point, activity = ACTIVITY[activityOf(id)];
        return <div key={id} className={styles.seat}>
          <CatSprite id={id} pose={activity.pose} {...body} z={depth(124)} duration={activity.duration}/>
          {activity.pose === "front-speak" && <Speech x={body.x + 21} y={body.y + 1}>{chatLine}</Speech>}
          {select({ x: body.x, y: body.y, w: 42, h: 44 })}
        </div>;
      })}
    </AreaStage>
    <p className={styles.agenda}><b>ラウンジ</b> 休憩中 {resting} 匹 · ワークスペースで作業中 {working} 匹{meeting > 0 && ` · 会議中 ${meeting} 匹`}{brewing && " · コーヒー抽出中"}</p>
    <ProfilePanel selected={selected} onSelect={setSelected} profile={profile} members={STAFF.map(({ id, name }) => ({ id, name, label: status(id).label }))}/>
  </section>;
}
