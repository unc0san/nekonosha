"use client";

import { useState, type CSSProperties } from "react";
import sceneData from "./president-room.json";
import styles from "./office-stage.module.css";
import { Sprite as StageSprite, useStageScale, type Point, type SpriteProps } from "./stage";
import { ExecutiveDesk } from "./executive-desk";

type OfficeTask = { title: string; owner: string; done: boolean };
type Prop = { id: string; src: string; x: number; y: number; w: number; h: number; z: number; frames?: number; duration?: number; effect?: "glow" };
type Seat = { cat: string; sprite: string; label: string; role: string; flip: boolean; chair: Point; body: Point; tail: Point; laptop: Point };
type Scene = { stage: { width: number; height: number }; props: Prop[]; desk: Point; seats: Seat[] };

const scene = sceneData as Scene;
const ASSETS = "/office/president/";

const Sprite = ({ src, ...props }: SpriteProps) => <StageSprite src={`${ASSETS}${src}`} {...props}/>;

export default function PresidentSuite({ department, tasks }: { department: string; tasks: OfficeTask[] }) {
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(0);
  const { width, height } = scene.stage;
  const { frame, scale } = useStageScale(width);

  const states = scene.seats.map(seat => {
    const task = tasks.find(item => !item.done && item.owner === seat.cat);
    return task ? { mode: "work" as const, label: "作業中", job: task.title } : { mode: "rest" as const, label: "休憩中", job: "担当タスクが完了。椅子でひと休みしています。" };
  });
  const current = scene.seats[selected];

  return <section className={styles.suite} aria-label="社長室（試作）">
    <div className={styles.toolbar}>
      <span><i className={styles.status}/> {department} <b>PRESIDENT SUITE · PROTOTYPE</b></span>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶ 再生" : "Ⅱ 一時停止"}</button>
    </div>
    <div className={styles.frame} ref={frame} tabIndex={0} aria-label="社長室のようす。狭い画面では左右にスクロールできます">
      <div className={`${styles.stage} ${paused ? styles.paused : ""}`} style={{ "--px": scale, "--stage-w": width, "--stage-h": height } as CSSProperties}>
        {scene.props.map(({ id, effect, ...prop }) => <Sprite key={id} {...prop} className={effect === "glow" ? styles.glow : ""}/>)}
        {/* Both executives at the long desk, facing each other over their laptops (same arrangement as the map) */}
        <ExecutiveDesk modes={states.map(state => state.mode)} z={10} delays={[0, -1.7]}>
          {(seat, index) => <div className={`${styles.seat} ${states[index].mode === "rest" ? styles.resting : ""} ${selected === index ? styles.selected : ""}`}>
            <span className={styles.bubble} style={{ "--x": seat.body.x + 21, "--y": seat.body.y - 4 } as CSSProperties} aria-hidden="true">{states[index].mode === "work" ? <><i/><i/><i/></> : "z Z"}</span>
            <span className={styles.label} style={{ "--x": seat.chair.x + 28, "--y": seat.chair.y + 70 } as CSSProperties} aria-hidden="true">{seat.label}</span>
            <button type="button" className={styles.hit} style={{ "--x": seat.chair.x, "--y": seat.body.y, "--w": 56, "--h": 70 } as CSSProperties} aria-pressed={selected === index} aria-label={`${seat.label}、${states[index].label}`} onClick={() => setSelected(index)}/>
          </div>}
        </ExecutiveDesk>
      </div>
    </div>
    <div className={styles.card} aria-live="polite">
      <div><span className={styles.kicker}>EMPLOYEE FILE / 0{selected + 1}</span><h3>{current.cat}<small>{current.role}</small></h3></div>
      <p>{states[selected].job}</p>
      <span className={`${styles.badge} ${states[selected].mode === "rest" ? styles.badgeRest : ""}`}>{states[selected].label}</span>
    </div>
  </section>;
}
