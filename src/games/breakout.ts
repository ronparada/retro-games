import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

type Brick = { x: number; y: number; w: number; h: number; color: string; alive: boolean };

export const createBreakout: GameFactory = () => {
  const meta = {
    id: 'breakout',
    name: 'Brick Blaster',
    tagline: 'Smash every neon brick',
    icon: '🧨',
    color: '#ff7f00',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 560;

  let paddle = { x: 150, y: H - 36, w: 90, h: 14 };
  let ball = { x: 200, y: 400, r: 7, vx: 180, vy: -220 };
  let bricks: Brick[] = [];
  let score = 0;
  let lives = 3;
  let status: GameState['status'] = 'idle';

  const ROW_COLORS = ['#ff0044', '#ff7700', '#ffee00', '#00ff88', '#00ccff'];

  function emit(): void {
    onStateChange({
      score,
      highScore: ScoreManager.getHighScore(meta.id),
      status,
      extra: { lives },
    });
  }

  function createBricks(): void {
    bricks = [];
    const cols = 8;
    const bw = 44;
    const bh = 16;
    const pad = 6;
    const offsetX = (W - cols * (bw + pad) + pad) / 2;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < cols; col++) {
        bricks.push({
          x: offsetX + col * (bw + pad),
          y: 50 + row * (bh + pad),
          w: bw,
          h: bh,
          color: ROW_COLORS[row],
          alive: true,
        });
      }
    }
  }

  function reset(): void {
    paddle.x = W / 2 - paddle.w / 2;
    ball = { x: W / 2, y: H - 80, r: 7, vx: 160 * (Math.random() > 0.5 ? 1 : -1), vy: -220 };
    score = 0;
    lives = 3;
    createBricks();
    emit();
  }

  function endGame(): void {
    status = 'gameover';
    loop.pause();
    ScoreManager.setHighScore(meta.id, score);
    emit();
  }

  function update(dt: number): void {
    if (status !== 'playing') return;

    if (input.isPause()) {
      status = 'paused';
      loop.pause();
      emit();
      return;
    }

    const ps = 320;
    if (input.isLeft()) paddle.x = Math.max(0, paddle.x - ps * dt);
    if (input.isRight()) paddle.x = Math.min(W - paddle.w, paddle.x + ps * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }

    if (
      ball.vy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w
    ) {
      ball.vy = -Math.abs(ball.vy);
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hit * 280;
    }

    bricks.forEach((b) => {
      if (!b.alive) return;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        b.alive = false;
        ball.vy *= -1;
        score += 10;
        emit();
      }
    });

    if (bricks.every((b) => !b.alive)) createBricks();

    if (ball.y - ball.r > H) {
      lives--;
      emit();
      if (lives <= 0) {
        endGame();
        return;
      }
      ball = { x: W / 2, y: H - 80, r: 7, vx: 160, vy: -220 };
      paddle.x = W / 2 - paddle.w / 2;
    }

    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    ctx.shadowBlur = 0;

    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (status === 'idle') drawGlowText(ctx, 'TAP START', W / 2, H / 2, '#ff00ff', 12);
    else if (status === 'paused') drawGlowText(ctx, 'PAUSED', W / 2, H / 2, '#00ffff', 12);
    else if (status === 'gameover') {
      drawGlowText(ctx, 'GAME OVER', W / 2, H / 2 - 12, '#ff00ff', 10);
      drawGlowText(ctx, `${score}`, W / 2, H / 2 + 12, '#00ffff', 10);
    }
  }

  return {
    meta,
    init(c, cb, sharedInput) {
      canvas = c;
      ctx = canvas.getContext('2d')!;
      canvas.width = W;
      canvas.height = H;
      onStateChange = cb;
      input = sharedInput;
      loop = new GameLoop(update, render);
      status = 'idle';
      emit();
    },
    start() {
      reset();
      status = 'playing';
      input.attach();
      loop.start();
      emit();
    },
    stop() {
      loop.stop();
      input.detach();
      status = 'idle';
      emit();
    },
    pause() {
      if (status === 'playing') {
        status = 'paused';
        loop.pause();
        emit();
      }
    },
    resume() {
      if (status === 'paused') {
        status = 'playing';
        loop.resume();
        emit();
      }
    },
    destroy() {
      loop.stop();
      input.detach();
    },
  };
};
