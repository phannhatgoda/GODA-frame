"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Measures the available box for a scaled preview. On desktop (lg+) the box has a fixed height
 * (sticky column), so the preview must fit BOTH width and height — otherwise a tall phone mock-up
 * gets cut off on laptop screens.
 */
export function useFitBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: mq.matches ? e.contentRect.height : 0 }));
    ro.observe(el);
    const onMq = () => setSize((s) => ({ ...s, h: mq.matches ? el.getBoundingClientRect().height : 0 }));
    mq.addEventListener("change", onMq);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);
  const scaleFor = (fw: number, fh: number) => Math.min(1, size.w / fw, size.h > 80 ? size.h / fh : Infinity);
  return { ref, scaleFor };
}
