"use client";

import { useEffect, useState, type CSSProperties } from "react";
import sceneData from "./meeting-room.json";
import studioData from "./work-studio.json";
import styles from "./office-stage.module.css";
import { Sprite, useStageScale, type Point } from "./stage";
import { STAFF, deskLabel, openTasksByStaff, type OfficeTask } from "./staff";

type Prop = { id: string; src: string; x: number; y: number; w: number; h: number; z: number; frames?: number; duration?: number; effect?: "glow" };
type Seat = { staff: string; view: "front" | "side"; body?: Point; chair?: Point; flip?: boolean };
type Scene = { stage: { width: number; height: number }; props: Prop[]; seats: Seat[]; lines: Record<string, Record<string, string>> };
type Pose = "speak" | "nod" | "read";

const scene = sceneData as Scene;
const L = studioData.seatLayout;
const ROOT = "/office/";
const TURN = 4500;
const POSES: Record<Pose, { label: string; duration: number }> = {
  speak: { label: "発言中", duration: 0.4 },
  nod: { label: "うなずき中", duration: 1.2 },
  read: { label: "資料を確認中", duration: 2.2 },
};

// Side seats reuse the desk framing, so body and tail offsets come from the work studio layout.
function sideParts(seat: Seat) {
  const { x, y } = seat.chair as Point, flip = !!seat.flip;
  return {
    body: { x: flip ? x + 56 - L.body.x - 42 : x + L.body.x, y: y + L.body.y },
    tail: { x: flip ? x + 56 - L.tail.x - 16 : x + L.tail.x, y: y + L.tail.y },
  };
}

export default function MeetingRoom({ department, tasks }: { department: string; tasks: OfficeTask[] }) {
  const { width, height } = scene.stage;
  const { frame, scale } = useStageScale(width, { center: true });
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(scene.seats[0].staff);
  const [turn, setTurn] = useState(0);

  // The floor passes round the table; pausing also holds the current speaker.
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setTurn(value => value + 1), TURN);
    return () => window.clearInterval(timer);
  }, [paused]);

  const open = openTasksByStaff(tasks);
  const speaker = scene.seats[turn % scene.seats.length].staff;
  // Cats with open work study their papers; the rest nod along.
  const poseOf = (id: string): Pose => (id === speaker ? "speak" : open[id]?.length ? "read" : "nod");
  const lineOf = (id: string) => (open[id]?.[0] ? `「${open[id][0].title}」の進み具合を共有します。` : scene.lines[department]?.[id] ?? "よろしくお願いします。");
  const openCount = tasks.filter(task => !task.done).length;
  const current = STAFF.find(member => member.id === selected) ?? STAFF[0];
  const currentPose = poseOf(selected);

  return <section className={styles.suite} aria-label="会議室（試作）">
    <div className={styles.toolbar}>
      <span><i className={styles.status}/> {department} <b>MEETING ROOM · PROTOTYPE</b></span>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶ 再生" : "Ⅱ 一時停止"}</button>
    </div>
    <div className={styles.frame} ref={frame} tabIndex={0} aria-label="会議室のようす。狭い画面では左右にスクロールできます">
      <div className={`${styles.stage} ${paused ? styles.paused : ""}`} style={{ "--px": scale, "--stage-w": width, "--stage-h": height } as CSSProperties}>
        {scene.props.map(({ id, src, effect, ...prop }) => <Sprite key={id} src={ROOT + src} {...prop} className={effect === "glow" ? styles.glow : ""}/>)}
        {scene.seats.map(seat => {
          const id = seat.staff, pose = poseOf(id), { duration } = POSES[pose];
          const name = STAFF.find(member => member.id === id)?.name ?? id, isSelected = selected === id;
          const select = (hit: Point & { w: number; h: number }) => <button type="button" className={styles.hit} aria-pressed={isSelected} aria-label={`${name}、${POSES[pose].label}`} onClick={() => setSelected(id)}
            style={{ "--x": hit.x, "--y": hit.y, "--w": hit.w, "--h": hit.h } as CSSProperties}/>;
          if (seat.view === "front") {
            const body = seat.body as Point;
            return <div key={id} className={`${styles.seat} ${isSelected ? styles.selected : ""}`}>
              <Sprite src={`${ROOT}meeting/furniture/armchair-back.png`} x={body.x + 2} y={body.y + 18} w={38} h={34} z={10}/>
              <Sprite src={`${ROOT}meeting/cats/${id}-front-${pose}.png`} {...body} w={42} h={46} z={14} frames={2} duration={duration}/>
              {pose === "speak" && <span className={styles.speech} style={{ "--x": body.x + 21, "--y": body.y + 1 } as CSSProperties}>{lineOf(id)}</span>}
              {isSelected && <span className={styles.nameTag} style={{ "--x": body.x + 21, "--y": body.y + 46 } as CSSProperties} aria-hidden="true">{name}</span>}
              {select({ x: body.x, y: body.y, w: 42, h: 44 })}
            </div>;
          }
          const chair = seat.chair as Point, { body, tail } = sideParts(seat);
          return <div key={id} className={`${styles.seat} ${isSelected ? styles.selected : ""}`}>
            <Sprite src={`${ROOT}president/furniture/egg-chair-back.png`} {...chair} w={56} h={68} z={11} flip={seat.flip}/>
            <Sprite src={`${ROOT}meeting/cats/${id}-side-${pose}.png`} {...body} w={42} h={50} z={14} frames={2} duration={duration} flip={seat.flip}/>
            <Sprite src={`${ROOT}president/furniture/egg-chair-front.png`} {...chair} w={56} h={68} z={15} flip={seat.flip}/>
            <Sprite src={`${ROOT}studio/cats/${id}-tail.png`} {...tail} w={16} h={16} z={16} frames={4} duration={2.4} flip={seat.flip}/>
            {pose === "speak" && <span className={styles.speech} style={{ "--x": body.x + 21, "--y": body.y + 1 } as CSSProperties}>{lineOf(id)}</span>}
            {isSelected && <span className={styles.nameTag} style={{ "--x": chair.x + 28, "--y": chair.y + 70 } as CSSProperties} aria-hidden="true">{name}</span>}
            {select({ x: chair.x, y: chair.y - 4, w: 56, h: 66 })}
          </div>;
        })}
      </div>
    </div>
    <p className={styles.agenda}><b>定例ミーティング</b> 議題 {openCount} 件 · いまの発言：{STAFF.find(member => member.id === speaker)?.name}</p>
    <div className={styles.roster} role="group" aria-label="猫社員を選択">
      {STAFF.map(({ id, name }) => <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>{name}<small>{POSES[poseOf(id)].label}</small></button>)}
    </div>
    <div className={styles.card} aria-live="polite">
      <div><span className={styles.kicker}>EMPLOYEE FILE · {current.coat} · {deskLabel(current.id, department)}</span><h3>{current.name}<small>{current.role}</small></h3></div>
      <p>担当タスク：{open[current.id]?.[0]?.title ?? "なし（担当分は完了しています）"}{currentPose === "speak" && <><br/>発言：{lineOf(current.id)}</>}</p>
      <span className={`${styles.badge} ${currentPose === "speak" ? styles.badgeWalk : currentPose === "read" ? styles.badgeRest : ""}`}>{POSES[currentPose].label}</span>
    </div>
  </section>;
}
