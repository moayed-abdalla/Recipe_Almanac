'use client';

import { useLayoutEffect } from 'react';

const LAYER_COUNT = 12;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Bias toward left/right gutters so icons are not clustered in the middle. */
function pickSideBiasedX(): number {
  const r = Math.random();
  if (r < 0.46) return randomInt(4, 30);
  if (r < 0.92) return randomInt(70, 96);
  return randomInt(34, 66);
}

function pixelDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  vw: number,
  vh: number
) {
  const ax = (a.x / 100) * vw;
  const ay = (a.y / 100) * vh;
  const bx = (b.x / 100) * vw;
  const by = (b.y / 100) * vh;
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Minimum center-to-center distance (~icon width 118px + breathing room).
 * Scales down slightly on narrow viewports so placement stays feasible.
 */
function minSpacingPx(vw: number) {
  return Math.max(88, Math.min(150, vw * 0.09));
}

/** Side-heavy slots with vertical staggering (used when random search needs help). */
function fallbackPositions(): { x: number; y: number }[] {
  const j = () => randomInt(-2, 2);
  return [
    { x: 9 + j(), y: 11 + j() },
    { x: 13 + j(), y: 27 + j() },
    { x: 7 + j(), y: 43 + j() },
    { x: 15 + j(), y: 59 + j() },
    { x: 10 + j(), y: 74 + j() },
    { x: 90 + j(), y: 15 + j() },
    { x: 86 + j(), y: 31 + j() },
    { x: 92 + j(), y: 47 + j() },
    { x: 84 + j(), y: 63 + j() },
    { x: 88 + j(), y: 76 + j() },
    { x: 5 + j(), y: 38 + j() },
    { x: 95 + j(), y: 52 + j() },
  ];
}

/**
 * Guaranteed 12 positions: two vertical columns on the far left/right with staggered Y.
 * Spacing is in % of height so icons stay separated on typical viewports.
 */
function guaranteedGrid(): { x: number; y: number }[] {
  const leftX = 11;
  const rightX = 89;
  /* ~15–17% vertical steps so stacked icons stay separated on short viewports */
  const leftY = [10, 26, 42, 58, 72, 34];
  const rightY = [18, 34, 50, 66, 8, 48];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    out.push({ x: leftX, y: leftY[i]! });
    out.push({ x: rightX, y: rightY[i]! });
  }
  return out;
}

function fits(
  candidate: { x: number; y: number },
  pts: { x: number; y: number }[],
  vw: number,
  vh: number,
  minPx: number
) {
  return pts.every((p) => pixelDistance(p, candidate, vw, vh) >= minPx);
}

/**
 * Sets --bg-mask-pos-1 … --bg-mask-pos-12 on the document root so stacked
 * body::before masks get new positions on each full page load.
 * Positions avoid overlap (minimum pixel gap) and favour the left/right sides.
 */
export default function BackgroundMaskPositions() {
  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let minPx = minSpacingPx(vw);

    const pts: { x: number; y: number }[] = [];

    const tryFill = (): boolean => {
      pts.length = 0;
      for (let i = 0; i < LAYER_COUNT; i++) {
        let placed = false;
        for (let attempt = 0; attempt < 180; attempt++) {
          const x = pickSideBiasedX();
          const y = randomInt(8, 76);
          const c = { x, y };
          if (fits(c, pts, vw, vh, minPx)) {
            pts.push(c);
            placed = true;
            break;
          }
        }
        if (!placed) {
          for (const slot of shuffle(fallbackPositions())) {
            if (fits(slot, pts, vw, vh, minPx * 0.9)) {
              pts.push(slot);
              placed = true;
              break;
            }
          }
        }
        if (!placed) {
          for (const slot of shuffle(fallbackPositions())) {
            if (fits(slot, pts, vw, vh, minPx * 0.78)) {
              pts.push(slot);
              placed = true;
              break;
            }
          }
        }
        if (!placed) return false;
      }
      return true;
    };

    if (!tryFill()) {
      minPx *= 0.82;
      if (!tryFill()) {
        pts.length = 0;
        pts.push(...guaranteedGrid());
      }
    }

    const root = document.documentElement;
    for (let i = 0; i < LAYER_COUNT; i++) {
      const p = pts[i]!;
      root.style.setProperty(`--bg-mask-pos-${i + 1}`, `${p.x}% ${p.y}%`);
    }
  }, []);

  return null;
}
