'use client';

import { useLayoutEffect } from 'react';

const LAYER_COUNT = 12;

function randomPercent(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sets --bg-mask-pos-1 … --bg-mask-pos-12 on the document root so stacked
 * body::before masks get new positions on each full page load.
 */
export default function BackgroundMaskPositions() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (let i = 1; i <= LAYER_COUNT; i++) {
      const x = randomPercent(5, 92);
      const y = randomPercent(8, 72);
      root.style.setProperty(`--bg-mask-pos-${i}`, `${x}% ${y}%`);
    }
  }, []);

  return null;
}
