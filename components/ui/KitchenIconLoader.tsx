'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/** Public URLs — matches `globals.css` mask stack */
export const BG_PIC_URLS = Array.from(
  { length: 12 },
  (_, i) => `/bg_pic_${String(i + 1).padStart(2, '0')}.png`
);

const SIZE_PX = { sm: 40, md: 52, lg: 64 } as const;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getReducedMotionClient() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServer() {
  return false;
}

interface KitchenIconLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  /** ms between frame changes */
  intervalMs?: number;
}

export default function KitchenIconLoader({
  size = 'lg',
  intervalMs = 750,
}: KitchenIconLoaderProps) {
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionClient,
    getReducedMotionServer
  );

  const px = SIZE_PX[size];

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % BG_PIC_URLS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const src = BG_PIC_URLS[index]!;

  const transition = prefersReducedMotion
    ? { duration: 0.22 }
    : { type: 'spring' as const, stiffness: 280, damping: 24 };

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{
        width: px,
        height: px,
        perspective: 220,
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0 text-base-content opacity-70"
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url('${src}')`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: `url('${src}')`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
          }}
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { rotateY: -88, opacity: 0 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { rotateY: 0, opacity: 1 }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { rotateY: 88, opacity: 0 }
          }
          transition={transition}
        />
      </AnimatePresence>
    </div>
  );
}
