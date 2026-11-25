// ============================================
// TanglePuzzle — Sound Effects (Web Audio API)
// No external files needed — all sounds are
// synthesised on the fly.
// ============================================

let audioCtx = null;
let warmedUp = false;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Call this on the very first mousedown / touchstart so the AudioContext
// is live before any drag-start fires.
export function warmUpAudio() {
  if (warmedUp) return;
  warmedUp = true;
  const ctx = getCtx();
  // Play an inaudible blip to fully unlock the context
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.01);
}

// ── Snap / Click sound ─────────────────────────
// Short, satisfying "click-pop" when a piece locks in
export function playSnap() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 1. Short high-frequency click
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1800, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // 2. Soft "thud" undertone for body
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.06);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.08);
  } catch {
    // Silently ignore if audio fails
  }
}

// ── Grab / Pick-up sound ───────────────────────
// Tiny upward blip when a piece is grabbed
export function playGrab() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Silently ignore
  }
}

// ── Victory / Cheer fanfare ────────────────────
// Ascending major chord arpeggio + shimmer burst
export function playCheer() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Major chord arpeggio: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const noteSpacing = 0.15;

    notes.forEach((freq, i) => {
      const t = now + i * noteSpacing;

      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
      gain.gain.setValueAtTime(0.25, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);

      // Harmonic shimmer (octave up, quieter)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t);
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.5);
    });

    // Final sustained chord at the end
    const chordTime = now + notes.length * noteSpacing;
    const chordFreqs = [523.25, 659.25, 783.99, 1046.5];

    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordTime);
      gain.gain.setValueAtTime(0, chordTime);
      gain.gain.linearRampToValueAtTime(0.15, chordTime + 0.08);
      gain.gain.setValueAtTime(0.15, chordTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(chordTime);
      osc.stop(chordTime + 1.5);
    });

    // Sparkle shimmer — short noise burst
    const bufferLen = ctx.sampleRate * 0.3;
    const noiseBuffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    // High-pass filter to make it sparkly
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(6000, chordTime);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, chordTime);
    noiseGain.gain.linearRampToValueAtTime(0.06, chordTime + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.3);
    noise.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(chordTime);
    noise.stop(chordTime + 0.3);
  } catch {
    // Silently ignore
  }
}
