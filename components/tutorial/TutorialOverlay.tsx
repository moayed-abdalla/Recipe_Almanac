'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface TutorialStep {
  /**
   * One or more CSS selectors for the element(s) to spotlight. The union of all
   * matched (visible) rects is highlighted. Omit for a centered, anchorless step.
   */
  selectors?: string[];
  title: string;
  body: string;
  /** Runs when the step becomes active (e.g. to preview an open dropdown). */
  onEnter?: () => void;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  /** Called once when the tour completes OR is exited early. */
  onFinish: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const CARD_WIDTH = 320;
const CARD_GAP = 14;

function measureUnion(selectors?: string[]): Rect | null {
  if (!selectors || selectors.length === 0) return null;
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let found = false;

  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    found = true;
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }

  if (!found) return null;
  return { top, left, width: right - left, height: bottom - top };
}

export default function TutorialOverlay({ steps, onFinish }: TutorialOverlayProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const finishedRef = useRef(false);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  const advance = useCallback(() => {
    if (isLast) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  }, [isLast, finish]);

  // Run the step's onEnter hook + scroll the anchor into view.
  useEffect(() => {
    if (!step) return;
    step.onEnter?.();
    if (step.selectors && step.selectors.length > 0) {
      const el = document.querySelector(step.selectors[0]) as HTMLElement | null;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Track the anchor rect: on mount/step change, on resize/scroll, and via a
  // light poll so dropdown open animations / layout shifts stay in sync.
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    const update = () => setRect(measureUnion(step.selectors));
    update();
    const interval = window.setInterval(update, 200);
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Allow Escape to advance and prevent body scroll while active.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, finish]);

  if (!mounted || !step) return null;

  // Card placement: prefer below the anchor, fall back to above, else center.
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0;

  let cardStyle: React.CSSProperties;
  if (rect) {
    const spaceBelow = viewportH - (rect.top + rect.height);
    const placeBelow = spaceBelow > 220 || spaceBelow >= rect.top;
    const top = placeBelow
      ? rect.top + rect.height + PADDING + CARD_GAP
      : Math.max(CARD_GAP, rect.top - PADDING - CARD_GAP);
    let left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
    left = Math.max(CARD_GAP, Math.min(left, viewportW - CARD_WIDTH - CARD_GAP));
    cardStyle = placeBelow
      ? { top, left }
      : { top: 'auto', bottom: viewportH - top, left };
  } else {
    cardStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[100] cursor-pointer"
      onClick={advance}
      role="dialog"
      aria-modal="true"
      aria-label="App tutorial"
    >
      {/* Spotlight: a transparent box with a huge box-shadow dims everything else */}
      {rect ? (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-200 ease-out ring-2 ring-primary"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.68)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* Caption card */}
      <div
        className="absolute w-[320px] max-w-[calc(100vw-28px)] cursor-default"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono opacity-60">
              {index + 1} / {steps.length}
            </span>
          </div>
          <h3 className="text-lg font-bold special-elite-regular text-base-content mb-1.5">
            {step.title}
          </h3>
          <p className="text-sm arial-font text-base-content/80 leading-relaxed">
            {step.body}
          </p>

          <div className="flex items-center justify-between gap-3 mt-4">
            <button
              type="button"
              onClick={finish}
              className="btn btn-ghost btn-sm text-xs opacity-70 hover:opacity-100 px-2"
            >
              Let me figure it out myself
            </button>
            <button
              type="button"
              onClick={advance}
              className="btn btn-primary btn-sm"
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
