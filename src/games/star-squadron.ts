import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import type { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import { drawAlienShip, drawSpaceship } from '../engine/sprites';
import type { GameFactory, GameState } from '../engine/types';

type Enemy = { x: number; y: number; w: number; h: number; color: string; points: number; anim: number };

export const createStarSquadron: GameFactory = () => {
  const meta = {
    id: 'star-squadron',
    name: 'Star Squadron',
    tagline: 'Formation shooter',
    icon: '⭐',
    color: '#ff44ff',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 560;

  let player = { x: 180, y: H - 60, w: 32, h: 40, anim: 0 };
  let bullets: { x: number; y: number }[] = [];
  let enemies: Enemy[] = [];
  let enemyBullets: { x: number; y: number }[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let enemyDir = 1;
  let enemySpeed = 50;
  let shootCd = 0;
  let status: GameState['status'] = 'idle';

  const TYPES = [
    { color: '#ffee00', points: 100, size: 28 },
    { color: '#ff44ff', points: 200, size: 32 },
    { color: '#00ffff', points: 300, size: 36 },
  ];

  function emit(): void {
    onStateChange({
      score, highScore: ScoreManager.getHighScore(meta.id), status,
      extra: { lives, level },
    });
  }

  function createEnemies(): void {
    enemies = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 7; col++) {
        const t = TYPES[row % 3];
        enemies.push({
          x: 30 + col * 48, y: 50 + row * 44,
          w: t.size, h: t.size, color: t.color, points: t.points, anim: 0,
        });
      }
    }
  }

  function reset(): void {
    player = { x: W / 2 - 16, y: H - 60, w: 32, h: 40, anim: 0 };
    bullets = [];
    enemyBullets = [];
    score = 0;
    lives = 3;
    level = 1;
    enemyDir = 1;
    enemySpeed = 50;
    shootCd = 0;
    createEnemies();
    emit();
  }

  function collide(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update(dt: number): void {
    if (status !== 'playing') return;
    if (input.isPause()) { status = 'paused'; loop.pause(); emit(); return; }

    const ps = 260;
    if (input.isLeft()) player.x = Math.max(0, player.x - ps * dt);
    if (input.isRight()) player.x = Math.min(W - player.w, player.x + ps * dt);
    player.anim += dt * 6;

    shootCd -= dt;
    if (input.isActionJustPressed() && shootCd <= 0) {
      bullets.push({ x: player.x + player.w / 2, y: player.y });
      shootCd = 0.18;
    }

    bullets = bullets.filter((b) => {
      b.y -= 400 * dt;
      return b.y > -5;
    });

    let edge = false;
    enemies.forEach((e) => {
      e.x += enemyDir * enemySpeed * dt;
      e.anim += dt * 5;
      if (e.x <= 4 || e.x + e.w >= W - 4) edge = true;
    });
    if (edge) {
      enemyDir *= -1;
      enemies.forEach((e) => (e.y += 16));
    }

    if (Math.random() < 0.012 * level) {
      const s = enemies[Math.floor(Math.random() * enemies.length)];
      if (s) enemyBullets.push({ x: s.x + s.w / 2, y: s.y + s.h });
    }

    enemyBullets = enemyBullets.filter((b) => {
      b.y += 220 * dt;
      if (collide(player.x, player.y, player.w, player.h, b.x - 2, b.y, 4, 10)) {
        lives--;
        emit();
        if (lives <= 0) {
          status = 'gameover';
          loop.pause();
          ScoreManager.setHighScore(meta.id, score);
          emit();
        } else {
          player.x = W / 2 - 16;
        }
        return false;
      }
      return b.y < H + 10;
    });

    bullets.forEach((b, bi) => {
      enemies.forEach((e, ei) => {
        if (collide(b.x - 2, b.y, 4, 10, e.x, e.y, e.w, e.h)) {
          bullets.splice(bi, 1);
          enemies.splice(ei, 1);
          score += e.points;
          emit();
        }
      });
    });

    if (enemies.some((e) => e.y + e.h >= player.y)) {
      status = 'gameover';
      loop.pause();
      ScoreManager.setHighScore(meta.id, score);
      emit();
    }

    if (enemies.length === 0) {
      level++;
      enemySpeed += 10;
      createEnemies();
      emit();
    }

    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    // Starfield
    ctx.fillStyle = '#333';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % W;
      const sy = (i * 53) % H;
      ctx.fillRect(sx, sy, 2, 2);
    }

    drawSpaceship(ctx, player.x, player.y, player.w, player.h, '#00ffcc', true);
    enemies.forEach((e) => drawAlienShip(ctx, e.x, e.y, e.w, e.h, e.color, e.anim));

    ctx.fillStyle = '#00ffff';
    bullets.forEach((b) => {
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
    });

    ctx.fillStyle = '#ff4466';
    enemyBullets.forEach((b) => {
      ctx.shadowColor = '#ff4466';
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2, b.y, 4, 10);
    });
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
