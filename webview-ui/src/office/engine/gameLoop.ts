import { MAX_DELTA_TIME_SEC } from '../../constants.js';

export interface GameLoopCallbacks {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

// Global speed multiplier for Agent Speed Boost feature
export let gameSpeedMultiplier = 1;
export function setGameSpeedMultiplier(multiplier: number) {
  gameSpeedMultiplier = multiplier;
}
export function getGameSpeedMultiplier() {
  return gameSpeedMultiplier;
}

export function startGameLoop(canvas: HTMLCanvasElement, callbacks: GameLoopCallbacks): () => void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  let lastTime = 0;
  let rafId = 0;
  let stopped = false;

  const frame = (time: number) => {
    if (stopped) return;
    const rawDt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, MAX_DELTA_TIME_SEC);
    const dt = rawDt * gameSpeedMultiplier;
    lastTime = time;

    callbacks.update(dt);

    ctx.imageSmoothingEnabled = false;
    callbacks.render(ctx);

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
