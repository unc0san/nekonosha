"use client";

import { useEffect, useState } from "react";
import sceneData from "./reception.json";
import styles from "./office-stage.module.css";
import { AreaStage, CatSprite, ChairCat, Hit, NameTag, ProfilePanel, Speech, type Profile } from "./area-stage";
import { DOOR, areaIndex, depth, type Area } from "./area";
import { TICK, sendTo, step, type Actor } from "./movement";
import type { OfficeTask } from "./staff";
import { officeTime, visitAt, type VisitPhase } from "./office-schedule";
import type { Point } from "./stage";

type Guest = { id: string; name: string; coat: string; purpose: string };
type Phase = "arrive" | "greet" | "guide" | "wait" | "leave" | "depart" | "gap";
type Scene = Area & { host: { id: string; name: string; coat: string; role: string }; guests: Guest[]; lines: Record<"greet" | "guide" | "wait" | "leave" | "depart", string> };
type Visit = { phase: Phase; elapsed: number; count: number; guest: Actor };

const scene = sceneData as Scene;
const { spots, pointOf } = areaIndex(scene);
const DESK = spots["front-desk"].body as Point;
const WAITING = spots.waiting.chair as Point;
const LOUNGE_DOOR = `${DOOR}lounge`;

// What the receptionist and the visitor are doing in each step of a visit.
const STEPS: Record<Phase, { host: "front-read" | "front-speak"; hostLabel: string; guestLabel: string; line?: keyof Scene["lines"] }> = {
  arrive: { host: "front-read", hostLabel: "受付中", guestLabel: "来社中" },
  greet: { host: "front-speak", hostLabel: "お出迎え中", guestLabel: "受付中", line: "greet" },
  guide: { host: "front-speak", hostLabel: "ご案内中", guestLabel: "移動中", line: "guide" },
  wait: { host: "front-read", hostLabel: "取次ぎ中", guestLabel: "待合で待機中", line: "wait" },
  leave: { host: "front-speak", hostLabel: "お見送り中", guestLabel: "会議室へ移動中", line: "leave" },
  depart: { host: "front-speak", hostLabel: "お見送り中", guestLabel: "お帰り", line: "depart" },
  gap: { host: "front-read", hostLabel: "受付中", guestLabel: "" },
};

// The visit follows the office schedule (the same one the map and the meeting room use); the meeting itself happens
// in the meeting room, so here that part of the visit is a gap.
const LOCAL: Record<VisitPhase, Phase> = { gap: "gap", arrive: "arrive", greet: "greet", guide: "guide", wait: "wait", leave: "leave", meeting: "gap", depart: "depart" };
const ORDER: Phase[] = ["arrive", "greet", "guide", "wait", "leave", "gap", "depart", "gap"];
// Where the visitor starts and heads in each step. A step that follows on from the previous one starts wherever the
// visitor already is; jumping in mid-visit (opening this screen later) starts from the step's usual place.
const LEG: Partial<Record<Phase, { from: string; to: string }>> = {
  arrive: { from: `${DOOR}entrance`, to: "counter" }, greet: { from: "counter", to: "counter" }, guide: { from: "counter", to: "waiting" },
  wait: { from: "waiting", to: "waiting" }, leave: { from: "waiting", to: LOUNGE_DOOR }, depart: { from: LOUNGE_DOOR, to: `${DOOR}entrance` },
};
const parked = (spot: string): Actor => ({ pos: pointOf(spot), path: [], seat: spot, dest: spot, heading: 1, wait: 0, stroll: false });

function advance(visit: Visit, dt: number, reduced: boolean, t: number): Visit {
  let guest = step({ guest: visit.guest }, dt).guest;
  if (reduced && !guest.seat) guest = { ...guest, pos: pointOf(guest.dest), path: [], seat: guest.dest, wait: 0 };
  const now = visitAt(t), phase = LOCAL[now.phase];
  if (phase === visit.phase && now.count === visit.count) return { ...visit, elapsed: now.elapsed, guest };
  const leg = LEG[phase];
  if (!leg) return { phase, count: now.count, elapsed: now.elapsed, guest };
  const follows = now.count === visit.count && ORDER.indexOf(phase) === ORDER.indexOf(visit.phase) + 1;
  const start = follows ? guest : parked(leg.from);
  const moved = leg.to === start.dest && start.seat ? start : sendTo(start, start.pos, leg.to, pointOf(leg.to), scene.walkY);
  return { phase, count: now.count, elapsed: now.elapsed, guest: reduced ? parked(leg.to) : moved };
}

export default function Reception({ department }: { department: string; tasks: OfficeTask[] }) {
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState("host");
  const [visit, setVisit] = useState<Visit>(() => ({ phase: "gap", elapsed: 0, count: 0, guest: parked(`${DOOR}entrance`) }));

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => setVisit(previous => advance(previous, TICK / 1000, reduced, officeTime())), TICK);
    return () => window.clearInterval(timer);
  }, [paused]);

  const { host } = scene, guestInfo = scene.guests[visit.count % scene.guests.length];
  const { guest, phase } = visit, now = STEPS[phase];
  const present = phase !== "gap";
  // The greeting ends with a little bow.
  const hostPose = phase === "greet" && visit.elapsed > 2400 ? "front-nod" : now.host;
  const line = now.line && (phase !== "wait" || visit.elapsed < 2600) ? scene.lines[now.line] : null;
  const shown = selected === "guest" && present ? "guest" : "host";

  let guestSprite = null;
  if (present && !guest.seat) {
    const x = Math.round(guest.pos.x) - 20, y = Math.round(guest.pos.y) - 40;
    guestSprite = <CatSprite id={guestInfo.id} pose="walk" x={x} y={y} z={depth(Math.round(guest.pos.y)) + 5} flip={guest.heading < 0} duration={0.6}/>;
  } else if (guest.seat === "counter") {
    const { x, y } = pointOf("counter");
    guestSprite = <CatSprite id={guestInfo.id} pose="stand" x={x - 20} y={y - 40} z={depth(y) + 5} flip={spots.counter.facing === -1}/>;
  }
  // Hit box and name tag follow wherever the visitor currently is.
  const guestBox = guest.seat === "waiting" ? { x: WAITING.x, y: WAITING.y - 4, w: 56, h: 66 } : { x: Math.round(guest.pos.x) - 20, y: Math.round(guest.pos.y) - 40, w: 44, h: 42 };

  const profile: Profile = shown === "host"
    ? { kicker: `EMPLOYEE FILE · ${host.coat} · 受付`, name: host.name, role: host.role, badge: now.hostLabel, tone: now.host === "front-speak" ? "walk" : undefined,
        body: <>担当タスク：来客対応・ご案内{present && <><br/>いまのお客さま：{guestInfo.name}（{guestInfo.purpose}）</>}{line && <><br/>「{line}」</>}</> }
    : { kicker: `VISITOR · ${guestInfo.coat}`, name: guestInfo.name, role: "来客", badge: now.guestLabel, tone: guest.seat ? "rest" : "walk",
        body: <>ご用件：{guestInfo.purpose}<br/>{phase === "depart" ? "会議室での打ち合わせを終えてお帰りです。" : "受付のあと、ラウンジを通って会議室へご案内します。"}</> };

  return <section className={styles.suite} aria-label="受付（試作）">
    <AreaStage area={scene} department={department} code="RECEPTION" paused={paused} onPause={() => setPaused(!paused)}>
      <ChairCat chair={WAITING} id={guest.seat === "waiting" ? guestInfo.id : undefined} pose="side-read" duration={2.2}/>
      {guestSprite}
      <CatSprite id={host.id} pose={hostPose} {...DESK} z={depth(145)} duration={hostPose === "front-speak" ? 0.4 : hostPose === "front-nod" ? 1.2 : 2.2}/>
      {line && <Speech x={DESK.x + 21} y={DESK.y + 1}>{line}</Speech>}
      {/* Below the counter, so the logo on its front stays visible. */}
      {shown === "host" && <NameTag x={DESK.x + 21} y={spots["front-desk"].stand.y} name={host.name}/>}
      {shown === "guest" && <NameTag x={guestBox.x + guestBox.w / 2} y={guestBox.y + guestBox.h} name={guestInfo.name}/>}
      <Hit x={DESK.x} y={DESK.y} w={42} h={44} label={`${host.name}、${now.hostLabel}`} pressed={shown === "host"} onSelect={() => setSelected("host")}/>
      {present && <Hit {...guestBox} label={`${guestInfo.name}、${now.guestLabel}`} pressed={shown === "guest"} onSelect={() => setSelected("guest")}/>}
    </AreaStage>
    <p className={styles.agenda}><b>本日の来客</b> {visit.count + 1} 組目 · {present ? `${guestInfo.name}：${now.guestLabel}` : "次のお客さまをお待ちしています"}</p>
    <ProfilePanel selected={shown} onSelect={setSelected} profile={profile}
      members={[{ id: "host", name: host.name, label: now.hostLabel }, ...(present ? [{ id: "guest", name: "お客さま", label: now.guestLabel }] : [])]}/>
  </section>;
}
