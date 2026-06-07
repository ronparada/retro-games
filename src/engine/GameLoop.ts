export type UpdateFn = (dt: number) => void;
export type RenderFn = () => void;

export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private paused = false;
  private update: UpdateFn;
  private render: RenderFn;

  constructor(update: UpdateFn, render: RenderFn) {
    this.update = update;
    this.render = render;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.running) return;
    this.paused = false;
    this.lastTime = performance.now();
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private tick = (time: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (!this.paused) {
      this.update(dt);
    }
    this.render();
  };
}
