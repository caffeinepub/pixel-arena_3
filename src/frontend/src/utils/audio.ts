let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.3,
  muted = false
) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio context not available
  }
}

export const sfx = {
  eat: (muted = false) => playTone(880, 0.08, "square", 0.2, muted),
  die: (muted = false) => {
    if (muted) return;
    playTone(200, 0.3, "sawtooth", 0.3, muted);
    setTimeout(() => playTone(150, 0.4, "sawtooth", 0.3, muted), 100);
    setTimeout(() => playTone(100, 0.5, "sawtooth", 0.3, muted), 250);
  },
  match: (muted = false) => {
    if (muted) return;
    playTone(523, 0.1, "sine", 0.25, muted);
    setTimeout(() => playTone(659, 0.1, "sine", 0.25, muted), 100);
    setTimeout(() => playTone(784, 0.2, "sine", 0.25, muted), 200);
  },
  mismatch: (muted = false) => playTone(200, 0.2, "square", 0.2, muted),
  whack: (muted = false) => playTone(440, 0.05, "square", 0.25, muted),
  miss: (muted = false) => playTone(150, 0.15, "sawtooth", 0.15, muted),
  clear: (muted = false) => {
    if (muted) return;
    playTone(523, 0.1, "sine", 0.3, muted);
    setTimeout(() => playTone(659, 0.1, "sine", 0.3, muted), 100);
    setTimeout(() => playTone(784, 0.1, "sine", 0.3, muted), 200);
    setTimeout(() => playTone(1047, 0.3, "sine", 0.3, muted), 300);
  },
  tick: (muted = false) => playTone(440, 0.05, "sine", 0.1, muted),
  reaction: (muted = false) => playTone(880, 0.1, "square", 0.3, muted),
  levelUp: (muted = false) => {
    if (muted) return;
    [392, 523, 659, 784].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, "square", 0.2, muted), i * 80);
    });
  },
  submit: (muted = false) => {
    if (muted) return;
    [262, 330, 392, 523].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.1, "sine", 0.2, muted), i * 60);
    });
  },
};
