/**
 * WebAudio chime used by inline step timers.
 *
 * Tones are generated on the fly with the Web Audio API so no audio file is
 * bundled. A single shared AudioContext is reused; `primeAudio` should be
 * called from inside a user gesture (e.g. starting a timer) so the context is
 * unlocked before the chime needs to fire when the countdown completes.
 */

let audioContext: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;

  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }

  return audioContext;
}

/**
 * Unlock / resume the shared AudioContext. Call from a user gesture so the
 * later chime is allowed to play under autoplay policies.
 */
export function primeAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Play three short, gently fading tones to signal a finished timer.
 */
export function playChime(): void {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // A pleasant rising arpeggio (A5, C#6, E6).
  const frequencies = [880, 1108.73, 1318.51];
  const toneLength = 0.35;
  const spacing = 0.18;
  const now = ctx.currentTime;

  frequencies.forEach((frequency, i) => {
    const startAt = now + i * spacing;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    // Quick attack then exponential fade out.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + toneLength);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + toneLength + 0.05);
  });
}
