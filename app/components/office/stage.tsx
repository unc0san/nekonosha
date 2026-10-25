"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./office-stage.module.css";

export type Point = { x: number; y: number };
export type SpriteProps = { src: string; x: number; y: number; w: number; h: number; z: number; frames?: number; duration?: number; flip?: boolean; className?: string };

// Every prop, cat part and piece of furniture is its own PNG layer positioned in stage pixels.
export function Sprite({ src, x, y, w, h, z, frames = 1, duration = 1, flip = false, className = "" }: SpriteProps) {
  const style = { "--x": x, "--y": y, "--w": w, "--h": h, "--z": z, "--frames": frames, "--duration": `${duration}s`, backgroundImage: `url(${src})` } as CSSProperties;
  return <span aria-hidden="true" className={`${styles.sprite} ${frames > 1 ? styles.animated : ""} ${flip ? styles.flip : ""} ${className}`} style={style}/>;
}

// Integer scaling keeps every art pixel square; narrow screens scroll instead of blurring.
// `center` starts a scrollable stage at its middle instead of the left wall.
export function useStageScale(width: number, { center = false } = {}) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(3);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(2, Math.floor(entry.contentRect.width / width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  useEffect(() => {
    const element = frame.current;
    if (center && element) element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
  }, [center, scale]);
  return { frame, scale };
}
