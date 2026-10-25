"use client";

import type { CSSProperties, ReactNode } from "react";
import studioData from "./work-studio.json";
import styles from "./office-stage.module.css";
import { Sprite, useStageScale, type Point } from "./stage";
import { depth, type Area } from "./area";
import { catSprite, type CatPose } from "./cat-sprites";

const ROOT = "/office/";
const L = studioData.seatLayout;
const at = (x: number, y: number, extra: Record<string, number> = {}) => ({ "--x": x, "--y": y, ...extra }) as CSSProperties;

// Toolbar, scrollable integer-scaled frame and the area's props; cats and overlays come in as children.
export function AreaStage({ area, department, code, paused, onPause, children }: { area: Area; department: string; code: string; paused: boolean; onPause: () => void; children: ReactNode }) {
  const { width, height } = area.stage;
  const { frame, scale } = useStageScale(width, { center: true });
  return <>
    <div className={styles.toolbar}>
      <span><i className={styles.status}/> {department} <b>{code} · PROTOTYPE</b></span>
      <button type="button" aria-pressed={paused} onClick={onPause}>{paused ? "▶ 再生" : "Ⅱ 一時停止"}</button>
    </div>
    <div className={styles.frame} ref={frame} tabIndex={0} aria-label={`${area.name}のようす。狭い画面では左右にスクロールできます`}>
      <div className={`${styles.stage} ${paused ? styles.paused : ""}`} style={{ "--px": scale, "--stage-w": width, "--stage-h": height } as CSSProperties}>
        {area.props.map(({ id, src, base, effect, ...prop }) => <Sprite key={id} src={ROOT + src} z={depth(base)} {...prop} className={effect === "glow" ? styles.glow : ""}/>)}
        {children}
      </div>
    </div>
  </>;
}

export function CatSprite({ id, pose, x, y, z, flip = false, duration = 1, className }: { id: string; pose: CatPose; x: number; y: number; z: number; flip?: boolean; duration?: number; className?: string }) {
  return <Sprite {...catSprite(id, pose)} x={x} y={y} z={z} flip={flip} duration={duration} className={className}/>;
}

// A cat curled up in an egg chair; body and tail offsets match the work studio desks.
export function ChairCat({ id, chair, flip = false, pose = "rest", duration = 2.4 }: { id?: string; chair: Point; flip?: boolean; pose?: CatPose; duration?: number }) {
  const z = depth(chair.y + 66);
  const body = { x: flip ? chair.x + 56 - L.body.x - 42 : chair.x + L.body.x, y: chair.y + L.body.y };
  const tail = { x: flip ? chair.x + 56 - L.tail.x - 16 : chair.x + L.tail.x, y: chair.y + L.tail.y };
  return <>
    <Sprite src={`${ROOT}president/furniture/egg-chair-back.png`} {...chair} w={56} h={68} z={z} flip={flip}/>
    {id && <CatSprite id={id} pose={pose} {...body} z={z + 2} flip={flip} duration={duration}/>}
    <Sprite src={`${ROOT}president/furniture/egg-chair-front.png`} {...chair} w={56} h={68} z={z + 3} flip={flip}/>
    {id && <CatSprite id={id} pose="tail" {...tail} z={z + 4} flip={flip} duration={duration * 2}/>}
  </>;
}

// A cat at a laptop on a room screen, turned toward it. `spot` is where the room's original 20×16 laptop sprite
// sat; the new laptop keeps its footprint with the screen facing the cat (`side` says which side the cat is on). The cat
// is the map's typing strips (body, head, tail, both paws), flipped to face right when it sits on the left. Paws go in
// front of the keyboard; the laptop screen runs three typing cycles in step with the paws. Off duty the screen idles.
// `front` lifts the laptop and near paw above furniture drawn between them and the cat (default: just above the cat).
const LAPTOP = { w: 26, h: 22 }, TYPE = { w: 44, h: 52, frames: 48, duration: 4.8 };
export function LaptopDesk({ id, spot, side, z, front = z + 1, delay = 0 }: { id?: string; spot: Point; side: "left" | "right"; z: number; front?: number; delay?: number }) {
  const left = side === "left", laptop = { x: spot.x - (left ? 1 : 5), y: spot.y - 5 };
  const box = { x: left ? laptop.x - 25 : laptop.x + 7, y: laptop.y - 9 };
  const part = (name: string, order: number, frames = TYPE.frames, duration = TYPE.duration) =>
    <Sprite src={`${ROOT}cats/${id}/type-${name}.png`} {...box} w={TYPE.w} h={TYPE.h} z={order} frames={frames} duration={duration} delay={delay} flip={left}/>;
  return <>
    {id && <>{part("far", z)}{part("tail", z, 4, 1.6)}{part("body", z, 1)}{part("head", z)}</>}
    <Sprite src={`${ROOT}desk/laptop-${id ? "type" : "idle"}.png`} {...laptop} w={LAPTOP.w} h={LAPTOP.h} z={front} frames={id ? TYPE.frames * 3 : 1} duration={TYPE.duration * 3} delay={delay} flip={!left}/>
    {id && part("near", front + 1)}
  </>;
}

export function BeanbagCat({ id, chair, flip = false }: { id?: string; chair: Point; flip?: boolean }) {
  const z = depth(chair.y + 26);
  return <>
    <Sprite src={`${ROOT}studio/furniture/beanbag-back.png`} {...chair} w={46} h={28} z={z}/>
    {id && <CatSprite id={id} pose="rest" x={chair.x} y={chair.y - 31} z={z + 2} flip={flip} duration={2.8}/>}
    <Sprite src={`${ROOT}studio/furniture/beanbag-front.png`} {...chair} w={46} h={28} z={z + 3}/>
  </>;
}

export function Speech({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <span className={styles.speech} style={at(x, y)}>{children}</span>;
}

export function NameTag({ x, y, name }: { x: number; y: number; name: string }) {
  return <span className={styles.nameTag} style={at(x, y)} aria-hidden="true">{name}</span>;
}

export function Hit({ x, y, w, h, label, pressed, onSelect }: Point & { w: number; h: number; label: string; pressed: boolean; onSelect: () => void }) {
  return <button type="button" className={styles.hit} aria-pressed={pressed} aria-label={label} onClick={onSelect} style={at(x, y, { "--w": w, "--h": h })}/>;
}

export type Profile = { kicker: string; name: string; role: string; body: ReactNode; badge: string; tone?: "rest" | "walk" };

// Roster buttons plus the detail card for whoever is selected.
export function ProfilePanel({ members, selected, onSelect, profile }: { members: { id: string; name: string; label: string }[]; selected: string; onSelect: (id: string) => void; profile: Profile }) {
  return <>
    <div className={styles.roster} role="group" aria-label="猫を選択">
      {members.map(({ id, name, label }) => <button key={id} type="button" aria-pressed={selected === id} onClick={() => onSelect(id)}>{name}<small>{label}</small></button>)}
    </div>
    <div className={styles.card} aria-live="polite">
      <div><span className={styles.kicker}>{profile.kicker}</span><h3>{profile.name}<small>{profile.role}</small></h3></div>
      <p>{profile.body}</p>
      <span className={`${styles.badge} ${profile.tone === "rest" ? styles.badgeRest : profile.tone === "walk" ? styles.badgeWalk : ""}`}>{profile.badge}</span>
    </div>
  </>;
}
