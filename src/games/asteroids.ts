import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import type { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

type Point = { x: number; y: number };
type Asteroid = {
  x: number; y: number; size: number;
  vx: number; vy: number; rot: number; rotSpeed: number;
  points: Point[];
};
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };

function genAsteroidPoints(size: number): Point[] {
  const pts: Point[] = [];
  const n = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = size * (0.8 + Math.random() * 0.4);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

export const createAsteroids: GameFactory = () => {
  const meta = {
    id: 'asteroids',
    name: 'Rock Dodger',
    tagline: 'Survive the asteroid field',
    icon: '☄️',
    color: '#ffaa00',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 400;

  let ship = { x: 200, y: 200, angle: 0, speed: 0 };
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let shootCd = 0;
  let status: GameState['status'] = 'idle';

  const shipShape = [{ x: 0, y: -14 }, { x: -8, y: 8 }, { x: 8, y: 8 }];

  function emit(): void {
    onStateChange({
      score, highScore: ScoreManager.getHighScore(meta.id), status,
      extra: { lives, level },
    });
  }

  function wrap(obj: { x: number; y: number }): void {
    obj.x = (obj.x + W) % W;
    obj.y = (obj.y + H) % H;
  }

  function spawnAsteroids(): void {
    for (let i = 0; i < 3 + level; i++) {
      asteroids.push({
        x: Math.random() * W, y: Math.random() * H,
        size: 28, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120,
        rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 2,
        points: genAsteroidPoints(28),
      });
    }
  }

  function splitAsteroid(a: Asteroid): void {
    if (a.size <= 12) return;
    const ns = a.size / 2;
    for (let i = 0; i < 2; i++) {
      asteroids.push({
        x: a.x, y: a.y, size: ns,
        vx: a.vx + (Math.random() - 0.5) * 80, vy: a.vy + (Math.random() - 0.5) * 80,
        rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 3,
        points: genAsteroidPoints(ns),
      });
    }
  }

  function reset(): void {
    ship = { x: W / 2, y: H / 2, angle: 0, speed: 0 };
    bullets = [];
    asteroids = [];
    score = 0;
    lives = 3;
    level = 1;
    shootCd = 0;
    spawnAsteroids();
    emit();
  }

  function hurt(): void {
    lives--;
    emit();
    if (lives <= 0) {
      status = 'gameover';
      loop.pause();
      ScoreManager.setHighScore(meta.id, score);
      emit();
      return;
    }
    ship = { x: W / 2, y: H / 2, angle: 0, speed: 0 };
  }

  function update(dt: number): void {
    if (status !== 'playing') return;
    if (input.isPause()) { status = 'paused'; loop.pause(); emit(); return; }

    if (input.isLeft()) ship.angle -= 4 * dt;
    if (input.isRight()) ship.angle += 4 * dt;
    if (input.isUp()) ship.speed = Math.min(ship.speed + 180 * dt, 200);
    else if (input.isDown()) ship.speed = Math.max(ship.speed - 180 * dt, -100);
    else ship.speed *= 0.98;

    ship.x += Math.cos(ship.angle) * ship.speed * dt;
    ship.y += Math.sin(ship.angle) * ship.speed * dt;
    wrap(ship);

    shootCd -= dt;
    if (input.isActionJustPressed() && shootCd <= 0) {
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * 16,
        y: ship.y + Math.sin(ship.angle) * 16,
        vx: Math.cos(ship.angle) * 400,
        vy: Math.sin(ship.angle) * 400,
        life: 1.2,
      });
      shootCd = 0.2;
    }

    bullets = bullets.filter((b) => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      wrap(b);
      return b.life > 0;
    });

    asteroids.forEach((a) => {
      a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.rotSpeed * dt;
      wrap(a);
    });

    bullets.forEach((b, bi) => {
      asteroids.forEach((a, ai) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy < a.size * a.size) {
          bullets.splice(bi, 1);
          asteroids.splice(ai, 1);
          score += 100;
          splitAsteroid(a);
          emit();
        }
      });
    });

    if (asteroids.length === 0) {
      level++;
      spawnAsteroids();
      emit();
    }

    asteroids.forEach((a) => {
      const dx = ship.x - a.x, dy = ship.y - a.y;
      if (dx * dx + dy * dy < (a.size + 12) ** 2) hurt();
    });

    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    asteroids.forEach((a) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.strokeStyle = '#aaa';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(a.points[0].x, a.points[0].y);
      a.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });
    ctx.shadowBlur = 0;

    bullets.forEach((b) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(shipShape[0].x, shipShape[0].y);
    shipShape.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
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
