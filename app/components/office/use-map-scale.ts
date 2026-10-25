"use client";

import { useEffect, useRef, useState } from "react";

const MAX = 2;
const PHONE_MIN = 2 / 3;

// Fixed scale for the office map, no user zoom: the largest size that fits the frame, snapped to whole device pixels
// so every art pixel stays crisp (1.5× on a Retina MacBook). Phones keep a readable minimum and scroll sideways.
export function useMapScale(stageWidth: number) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let first = true;
    const observer = new ResizeObserver(([entry]) => {
      const dpr = window.devicePixelRatio || 1, fit = Math.min(MAX, entry.contentRect.width / stageWidth);
      const snapped = Math.floor(fit * dpr) / dpr, minimum = Math.ceil(PHONE_MIN * dpr) / dpr;
      setScale(Math.max(minimum, snapped));
      // When the building is wider than the screen, start on its middle.
      if (first && snapped < minimum) requestAnimationFrame(() => requestAnimationFrame(() => { element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2; }));
      first = false;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [stageWidth]);

  return { frame, scale };
}
