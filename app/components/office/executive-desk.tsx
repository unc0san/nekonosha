"use client";

import type { ReactNode } from "react";
import sceneData from "./president-room.json";
import styles from "./office-stage.module.css";
import { Sprite, type Point } from "./stage";
import { LaptopDesk } from "./area-stage";

type Seat = (typeof sceneData.seats)[number];
export type ExecutiveMode = "work" | "rest";

const ROOT = "/office/president/";
const DESK = { w: 136, h: 50 };

// The president's suite: one long desk for two, しらす at the left end and ぽんず at the right, each in an egg chair
// facing the other across a laptop. The suite screen and the whole-office map both draw it from here, so the two
// always agree. Positions are suite-stage pixels moved by `at`; layers count up from `z`: chair shells, desk top,
// cats, chair rims, desk edge and feet, laptops, near paws. Working cats type; resting cats doze by an idle laptop.
export function ExecutiveDesk({ modes, at = { x: 0, y: 0 }, z, delays = [0, 0], children }: { modes: ExecutiveMode[]; at?: Point; z: number; delays?: number[]; children?: (seat: Seat, index: number, shift: (p: Point) => Point) => ReactNode }) {
  const shift = (p: Point) => ({ x: p.x + at.x, y: p.y + at.y });
  const desk = shift(sceneData.desk);
  return <>
    <Sprite src={`${ROOT}furniture/duo-desk-top.png`} x={desk.x} y={desk.y} w={DESK.w} h={DESK.h} z={z + 1}/>
    <Sprite src={`${ROOT}furniture/duo-desk-front.png`} x={desk.x} y={desk.y} w={DESK.w} h={DESK.h} z={z + 4}/>
    {sceneData.seats.map((seat, index) => {
      const chair = shift(seat.chair), side = seat.flip ? "right" : "left", working = modes[index] === "work";
      return <div key={seat.sprite} className={styles.seat}>
        <Sprite src={`${ROOT}furniture/egg-chair-back.png`} {...chair} w={56} h={68} z={z} flip={seat.flip}/>
        {working
          ? <LaptopDesk id={seat.sprite} spot={shift(seat.laptop)} side={side} z={z + 2} front={z + 5} delay={delays[index]}/>
          : <>
            <Sprite src={`${ROOT}cats/${seat.sprite}-rest.png`} {...shift(seat.body)} w={42} h={50} z={z + 2} frames={2} duration={2.4} flip={seat.flip}/>
            <Sprite src={`${ROOT}cats/${seat.sprite}-tail.png`} {...shift(seat.tail)} w={16} h={16} z={z + 4} frames={4} duration={4.8} flip={seat.flip}/>
            <LaptopDesk spot={shift(seat.laptop)} side={side} z={z + 5}/>
          </>}
        <Sprite src={`${ROOT}furniture/egg-chair-front.png`} {...chair} w={56} h={68} z={z + 3} flip={seat.flip}/>
        {children?.(seat, index, shift)}
      </div>;
    })}
  </>;
}
