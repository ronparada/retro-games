import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import type { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import { drawDelorean, drawKid } from '../engine/sprites';
import type { GameFactory, GameState } from '../engine/types';

type Vehicle = { x: number; y: number; w: number; h: number; vx: number; lane: number };

export const createHopper: GameFactory = () => {
  const meta = {
    id: 'hopper',
    name: 'River Hopper',
    tagline: 'Dodge the time machines',
    icon: '🚗',
    color: '#44ff44',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 560;

  let kid = { x: 180, y: H - 54, w: 28, h: 36 };
  let vehicles: Vehicle[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let hopCd = 0;
  let status: GameState['status'] = 'idle';

  const LANES = [
    { y: 420, speed: 90, w: 72 },
    { y: 360, speed: -110, w: 80 },
    { y: 300, speed: 130, w: 68 },
    { y: 240, speed: -100, w: 76 },
    { y: 180, speed: 120, w: 70 },
  ];

  function emit(): void {
    onStateChange({
      score, highScore: ScoreManager.getHighScore(meta.id), status,
      extra: { lives, level },
    });
  }

  function resetKid(): void {
    kid.x = W / 2 - kid.w / 2;
    kid.y = H - 54;
  }

  function setupLevel(): void {
    vehicles = [];
    LANES.forEach((lane, li) => {
      for (let i = 0; i < 3; i++) {
        vehicles.push({
          x: i * (W / 3) + Math.random() * 40,
          y: lane.y, w: lane.w, h: 32,
          vx: lane.speed * (1 + level * 0.08),
          lane: li,
        });
      }
    });
  }

  function reset(): void {
    score = 0;
    lives = 3;
    level = 1;
    hopCd = 0;
    resetKid();
    setupLevel();
    emit();
  }

  function collide(a: typeof kid, b: { x: number; y: number; w: number; h: number }): boolean {
    const pad = 4;
    return a.x + pad < b.x + b.w - pad && a.x + a.w - pad > b.x + pad &&
           a.y + pad < b.y + b.h - pad && a.y + a.h - pad > b.y + pad;
  }

  function die(): void {
    lives--;
    emit();
    if (lives <= 0) {
      status = 'gameover';
      loop.pause();
      ScoreManager.setHighScore(meta.id, score);
      emit();
    } else {
      resetKid();
    }
  }

  function update(dt: number): void {
    if (status !== 'playing') return;
    if (input.isPause()) { status = 'paused'; loop.pause(); emit(); return; }

    hopCd -= dt;
    const hop = 50;
    if (hopCd <= 0) {
      if (input.isUp()) { kid.y = Math.max(70, kid.y - hop); hopCd = 0.18; }
      else if (input.isDown()) { kid.y = Math.min(H - kid.h - 10, kid.y + hop); hopCd = 0.18; }
      else if (input.isLeft()) { kid.x = Math.max(0, kid.x - hop); hopCd = 0.18; }
      else if (input.isRight()) { kid.x = Math.min(W - kid.w, kid.x + hop); hopCd = 0.18; }
    }

    vehicles.forEach((v) => {
      v.x += v.vx * dt;
      if (v.vx > 0 && v.x > W) v.x = -v.w;
      if (v.vx < 0 && v.x < -v.w) v.x = W;
    });

    // Check vehicle collisions on road lanes
    vehicles.forEach((v) => {
      if (Math.abs(kid.y - v.y) < 28 && collide(kid, v)) die();
    });

    // Reached goal zone
    if (kid.y < 110) {
      score += 100;
      level++;
      setupLevel();
      resetKid();
      emit();
    }

    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    // Sidewalk (start)
    ctx.fillStyle = '#333';
    ctx.fillRect(0, H - 80, W, 80);
    ctx.fillStyle = '#666';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('START', W / 2, H - 20);

    // Goal zone
    ctx.fillStyle = '#003322';
    ctx.fillRect(0, 50, W, 60);
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#44ff44';
    ctx.fillText('GOAL', W / 2, 88);
    ctx.shadowBlur = 0;

    // Road lanes
    LANES.forEach((lane) => {
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(0, lane.y - 4, W, 40);
      // Lane dashes
      ctx.strokeStyle = '#ffee00';
      ctx.setLineDash([12, 16]);
      ctx.beginPath();
      ctx.moveTo(0, lane.y + 16);
      ctx.lineTo(W, lane.y + 16);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    vehicles.forEach((v) => {
      drawDelorean(ctx, v.x, v.y, v.w, v.h, v.vx > 0);
    });

    drawKid(ctx, kid.x, kid.y, kid.w, kid.h);

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
      canvas = c; ctx = canvas.getContext('2d')!;
      canvas.width = W; canvas.height = H;
      onStateChange = cb; input = sharedInput;
      loop = new GameLoop(update, render);
      status = 'idle'; emit();
    },
    start() { reset(); status = 'playing'; input.attach(); loop.start(); emit(); },
    stop() { loop.stop(); input.detach(); status = 'idle'; emit(); },
    pause() { if (status === 'playing') { status = 'paused'; loop.pause(); emit(); } },
    resume() { if (status === 'paused') { status = 'playing'; loop.resume(); emit(); } },
    destroy() { loop.stop(); input.detach(); },
  };
};
