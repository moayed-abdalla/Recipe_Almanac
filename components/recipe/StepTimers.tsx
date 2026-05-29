/**
 * StepTimers
 *
 * Renders a single recipe method step, detecting time phrases (e.g.
 * "30 minutes", "5 to 7 minutes", "45 secs", "1.5 hours") and turning each one
 * into an inline countdown timer the cook can start, pause, and reset.
 *
 * - Detected phrases are highlighted and immediately followed by a small
 *   "Start Nm" button.
 * - Range phrases ("5 to 7 minutes") default to the upper bound and expose a
 *   tiny dropdown so the lower bound can be chosen instead.
 * - Multiple timers run independently with component-local state only.
 * - A finished timer plays a soft WebAudio chime once (unless muted) and shows
 *   a "Done — restart" button.
 * - Running timers report their state up through the shared timer context so
 *   the page can keep the screen awake while anything is counting down.
 */

'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRecipeTimer } from './timerContext';
import { playChime, primeAudio } from '@/lib/timerChime';

const TIME_REGEX =
  /(\d+(?:\.\d+)?)\s*(?:to|–|-|—)?\s*(?:(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

interface TimeMatch {
  matchText: string;
  low: number;
  high: number | null;
  unit: string;
}

type Token =
  | { type: 'text'; value: string }
  | { type: 'timer'; match: TimeMatch };

function unitToSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('h')) return 3600;
  if (u.startsWith('s')) return 1;
  return 60;
}

function unitSuffix(unit: string): string {
  const u = unit.toLowerCase();
  if (u.startsWith('h')) return 'h';
  if (u.startsWith('s')) return 's';
  return 'm';
}

function unitLabel(unit: string, amount: number): string {
  const u = unit.toLowerCase();
  if (u.startsWith('h')) return `${amount} ${amount === 1 ? 'hr' : 'hrs'}`;
  if (u.startsWith('s')) return `${amount} ${amount === 1 ? 'sec' : 'secs'}`;
  return `${amount} ${amount === 1 ? 'min' : 'mins'}`;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function parseStep(step: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  TIME_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TIME_REGEX.exec(step)) !== null) {
    const [full, first, second, unit] = match;

    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: step.slice(lastIndex, match.index) });
    }

    tokens.push({
      type: 'timer',
      match: {
        matchText: full,
        low: parseFloat(first),
        high: second !== undefined ? parseFloat(second) : null,
        unit,
      },
    });

    lastIndex = match.index + full.length;
  }

  if (lastIndex < step.length) {
    tokens.push({ type: 'text', value: step.slice(lastIndex) });
  }

  return tokens;
}

type Phase = 'idle' | 'running' | 'paused' | 'finished';

function InlineTimer({ match, timerId }: { match: TimeMatch; timerId: string }) {
  const { muted, setTimerRunning } = useRecipeTimer();

  const hasRange = match.high != null && match.high !== match.low;
  const unitSeconds = unitToSeconds(match.unit);

  const [chosenAmount, setChosenAmount] = useState<number>(match.high ?? match.low);
  const baseSeconds = Math.round(chosenAmount * unitSeconds);

  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState<number>(baseSeconds);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef<boolean>(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Keep the displayed duration in sync while idle (e.g. dropdown changes).
  useEffect(() => {
    if (phase === 'idle') {
      setRemaining(baseSeconds);
    }
  }, [baseSeconds, phase]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const clearTick = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const tick = () => {
    const rem = Math.round((endTimeRef.current - Date.now()) / 1000);
    if (rem <= 0) {
      clearTick();
      setRemaining(0);
      setPhase('finished');
      setTimerRunning(timerId, false);
      if (!mutedRef.current) {
        playChime();
      }
    } else {
      setRemaining(rem);
    }
  };

  const startCountdown = (seconds: number) => {
    if (seconds <= 0) return;
    primeAudio();
    endTimeRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setPhase('running');
    setTimerRunning(timerId, true);
    clearTick();
    intervalRef.current = setInterval(tick, 250);
  };

  const pause = () => {
    clearTick();
    const rem = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
    setRemaining(rem);
    setPhase('paused');
    setTimerRunning(timerId, false);
  };

  const reset = () => {
    clearTick();
    setPhase('idle');
    setRemaining(baseSeconds);
    setTimerRunning(timerId, false);
  };

  // Cancel a live countdown and stop reporting it if the timer unmounts
  // (e.g. navigating away).
  useEffect(() => {
    return () => {
      clearTick();
      setTimerRunning(timerId, false);
    };
  }, [timerId, setTimerRunning]);

  if (phase === 'running' || phase === 'paused') {
    return (
      <span className="inline-flex items-center gap-1 align-middle mx-1">
        <span
          className={`badge badge-sm badge-primary font-mono ${
            phase === 'running' && !reduceMotion ? 'animate-pulse' : ''
          }`}
        >
          {formatClock(remaining)}
        </span>
        {phase === 'running' ? (
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={pause}
            aria-label="Pause timer"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-xs btn-primary"
            onClick={() => startCountdown(remaining)}
            aria-label="Resume timer"
          >
            Resume
          </button>
        )}
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={reset}
          aria-label="Reset timer"
        >
          Reset
        </button>
      </span>
    );
  }

  if (phase === 'finished') {
    return (
      <button
        type="button"
        className="btn btn-xs btn-success align-middle mx-1"
        onClick={() => startCountdown(baseSeconds)}
        aria-label="Restart timer"
      >
        Done — restart
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 align-middle mx-1">
      {hasRange && (
        <select
          className="select select-xs select-bordered"
          value={chosenAmount}
          onChange={(e) => setChosenAmount(parseFloat(e.target.value))}
          aria-label="Choose timer duration"
        >
          <option value={match.low}>{unitLabel(match.unit, match.low)}</option>
          <option value={match.high as number}>{unitLabel(match.unit, match.high as number)}</option>
        </select>
      )}
      <button
        type="button"
        className="btn btn-xs btn-primary"
        onClick={() => startCountdown(baseSeconds)}
        aria-label={`Start ${unitLabel(match.unit, chosenAmount)} timer`}
      >
        Start {chosenAmount}
        {unitSuffix(match.unit)}
      </button>
    </span>
  );
}

export default function StepTimers({ step, index }: { step: string; index: number }) {
  const tokens = useMemo(() => parseStep(step), [step]);

  let timerCount = 0;

  return (
    <>
      {tokens.map((token, i) => {
        if (token.type === 'text') {
          return <Fragment key={i}>{token.value}</Fragment>;
        }

        const timerId = `${index}-${timerCount++}`;
        return (
          <Fragment key={i}>
            <span className="bg-primary/10 underline decoration-primary/40 underline-offset-2 rounded px-0.5 arial-font">
              {token.match.matchText}
            </span>
            <InlineTimer match={token.match} timerId={timerId} />
          </Fragment>
        );
      })}
    </>
  );
}
