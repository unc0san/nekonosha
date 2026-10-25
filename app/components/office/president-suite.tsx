"use client";

import { useState, type CSSProperties } from "react";
import sceneData from "./president-room.json";
import styles from "./office-stage.module.css";
import { Sprite as StageSprite, useStageScale, type Point, type SpriteProps } from "./stage";

type OfficeTask = { title: string; owner: string; done: boolean };
type Prop = { id: string; src: string; x: number; y: number; w: number; h: number; z: number; frames?: number; duration?: number; effect?: "glow" };
type Seat = { cat: string; sprite: string; label: string; role: string; flip: boolean; chair: Point; body: Point; tail: Point; laptop: Point };
type Scene = { stage: { width: number; height: number }; props: Prop[]; seats: Seat[] };

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
        {scene.seats.map((seat, index) => {
          const state = states[index];
          return <div key={seat.cat} className={`${styles.seat} ${state.mode === "rest" ? styles.resting : ""} ${selected === index ? styles.selected : ""}`}>
            <Sprite src="furniture/egg-chair-back.png" {...seat.chair} w={56} h={68} z={10} flip={seat.flip}/>
            <Sprite src={`cats/${seat.sprite}-${state.mode}.png`} {...seat.body} w={42} h={50} z={12} frames={2} duration={state.mode === "work" ? 0.5 : 2.4} flip={seat.flip}/>
            {state.mode === "work" && <Sprite src={`cats/${seat.sprite}-blink.png`} {...seat.body} w={42} h={50} z={12} flip={seat.flip} className={`${styles.blink} ${index ? styles.blinkLate : ""}`}/>}
            <Sprite src="furniture/egg-chair-front.png" {...seat.chair} w={56} h={68} z={13} flip={seat.flip}/>
            <Sprite src={`cats/${seat.sprite}-tail.png`} {...seat.tail} w={16} h={16} z={14} frames={4} duration={state.mode === "work" ? 2.4 : 4.8} flip={seat.flip}/>
            <Sprite src="furniture/laptop.png" {...seat.laptop} w={20} h={16} z={15} flip={seat.flip}/>
            <span className={styles.bubble} style={{ "--x": seat.body.x + 21, "--y": seat.body.y - 4 } as CSSProperties} aria-hidden="true">{state.mode === "work" ? <><i/><i/><i/></> : "z Z"}</span>
            <span className={styles.label} style={{ "--x": seat.chair.x + 28, "--y": seat.chair.y + 70 } as CSSProperties} aria-hidden="true">{seat.label}</span>
            <button type="button" className={styles.hit} style={{ "--x": seat.chair.x, "--y": seat.body.y, "--w": 56, "--h": 70 } as CSSProperties} aria-pressed={selected === index} aria-label={`${seat.label}、${state.label}`} onClick={() => setSelected(index)}/>
          </div>;
        })}
      </div>
    </div>
    <div className={styles.card} aria-live="polite">
      <div><span className={styles.kicker}>EMPLOYEE FILE / 0{selected + 1}</span><h3>{current.cat}<small>{current.role}</small></h3></div>
      <p>{states[selected].job}</p>
      <span className={`${styles.badge} ${states[selected].mode === "rest" ? styles.badgeRest : ""}`}>{states[selected].label}</span>
    </div>
  </section>;
}
