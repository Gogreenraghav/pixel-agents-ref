import {
  NOTIFICATION_NOTE_1_HZ,
  NOTIFICATION_NOTE_1_START_SEC,
  NOTIFICATION_NOTE_2_HZ,
  NOTIFICATION_NOTE_2_START_SEC,
  NOTIFICATION_NOTE_DURATION_SEC,
  NOTIFICATION_VOLUME,
} from './constants.js';

let soundEnabled = true;
let audioCtx: AudioContext | null = null;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function playNote(ctx: AudioContext, freq: number, startOffset: number, type: OscillatorType = 'sine'): void {
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);

  gain.gain.setValueAtTime(NOTIFICATION_VOLUME, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + NOTIFICATION_NOTE_DURATION_SEC);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + NOTIFICATION_NOTE_DURATION_SEC);
}

export async function playDoneSound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    playNote(audioCtx, NOTIFICATION_NOTE_1_HZ, NOTIFICATION_NOTE_1_START_SEC);
    playNote(audioCtx, NOTIFICATION_NOTE_2_HZ, NOTIFICATION_NOTE_2_START_SEC);
  } catch {
    // Audio may not be available
  }
}

// 🎉 Success/Hire sound - ascending cheerful notes
export async function playSuccessSound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    playNote(audioCtx, 523, 0, 'sine');
    playNote(audioCtx, 659, 0.1, 'sine');
    playNote(audioCtx, 784, 0.2, 'sine');
  } catch {
    // ignore
  }
}

// 💰 Money sound - coin-like ding
export async function playMoneySound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    playNote(audioCtx, 1319, 0, 'square');
    playNote(audioCtx, 1568, 0.05, 'square');
  } catch {
    // ignore
  }
}

// ⭐ Level up sound - triumphant fanfare
export async function playLevelUpSound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    playNote(audioCtx, 392, 0, 'triangle');
    playNote(audioCtx, 494, 0.15, 'triangle');
    playNote(audioCtx, 587, 0.3, 'triangle');
    playNote(audioCtx, 784, 0.45, 'triangle');
  } catch {
    // ignore
  }
}

// 👋 Fire sound - descending sad tone
export async function playFireSound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    playNote(audioCtx, 440, 0, 'sawtooth');
    playNote(audioCtx, 392, 0.2, 'sawtooth');
    playNote(audioCtx, 349, 0.4, 'sawtooth');
  } catch {
    // ignore
  }
}

// 🔔 Alert/Warning sound
export async function playAlertSound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    playNote(audioCtx, 880, 0, 'square');
    playNote(audioCtx, 880, 0.15, 'square');
  } catch {
    // ignore
  }
}

/** Call from any user-gesture handler to ensure AudioContext is unlocked */
export function unlockAudio(): void {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch {
    // ignore
  }
}
