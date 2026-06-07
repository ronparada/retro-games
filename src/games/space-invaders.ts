import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

type Rect = { x: number; y: number; w: number; h: number; color: string; points?: number };

export const createSpaceInvaders: GameFactory = () => {
  const meta = {
    id: 'space-invaders',
    name: 'Alien Siege',
    tagline: 'Defend Earth from the swarm',
    icon: '👾',
    color: '#00ff00',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 560;

  let player: Rect;
  let bullets: Rect[] = [];
  let enemies: Rect[] = [];
  let enemyBullets: Rect[] = [];
  let score = 0;
  let level = 1;
  let enemyDir = 1;
  let enemySpeed = 40;
  let shootCooldown = 0;
  let animFrame = 0;
  let status: GameState['status'] = 'idle';

  const ENEMY_TYPES = [
    { color: '#ff4466', points: 30 },
    { color: '#44ff88', points: 20 },
    { color: '#4488ff', points: 10 },
  ];

  function emit(): void {
    onStateChange({
      score,
      highScore: ScoreManager.getHighScore(meta.id),
      status,
      extra: { level },
    });
  }

  function resetPlayer(): void {
    player = { x: W / 2 - 22, y: H - 50, w: 44, h: 24, color: '#00ff88' };
  }

  function createEnemies(): void {
    enemies = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 9; col++) {
        const type = ENEMY_TYPES[Math.floor(row / 2) % 3];
        enemies.push({
          x: 30 + col * 38,
          y: 40 + row * 34,
          w: 28,
          h: 22,
          color: type.color,
          points: type.points,
        });
      }
    }
  }

  function reset(): void {
    resetPlayer();
    bullets = [];
    enemyBullets = [];
    score = 0;
    level = 1;
    enemyDir = 1;
    enemySpeed = 40;
    createEnemies();
    emit();
  }

  function collide(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

    const speed = 220;
    if (input.isLeft()) player.x = Math.max(0, player.x - speed * dt);
    if (input.isRight()) player.x = Math.min(W - player.w, player.x + speed * dt);

    shootCooldown -= dt;
    if (input.isActionJustPressed() && shootCooldown <= 0 && bullets.length < 3) {
      bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 12, color: '#fff' });
      shootCooldown = 0.25;
    }

    bullets = bullets.filter((b) => {
      b.y -= 360 * dt;
      return b.y > -10;
    });

    let edge = false;
    enemies.forEach((e) => {
      e.x += enemyDir * enemySpeed * dt;
      if (e.x <= 4 || e.x + e.w >= W - 4) edge = true;
    });

    if (edge) {
      enemyDir *= -1;
      enemies.forEach((e) => (e.y += 14));
    }

    if (Math.random() < 0.015 * level) {
      const shooter = enemies[Math.floor(Math.random() * enemies.length)];
      if (shooter) {
        enemyBullets.push({
          x: shooter.x + shooter.w / 2 - 2,
          y: shooter.y + shooter.h,
          w: 4,
          h: 12,
          color: '#ff4466',
        });
      }
    }

    enemyBullets = enemyBullets.filter((b) => {
      b.y += 200 * dt;
      if (collide(b, player)) {
        endGame();
        return false;
      }
      return b.y < H + 10;
    });

    bullets.forEach((b, bi) => {
      enemies.forEach((e, ei) => {
        if (collide(b, e)) {
          bullets.splice(bi, 1);
          enemies.splice(ei, 1);
          score += e.points ?? 10;
          emit();
        }
      });
    });

    if (enemies.some((e) => e.y + e.h >= player.y)) endGame();

    if (enemies.length === 0) {
      level++;
      enemySpeed += 8;
      createEnemies();
      emit();
    }

    animFrame += dt;
    input.endFrame();
  }

  function drawAlien(e: Rect, frame: number): void {
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 8;
    const wobble = Math.sin(frame * 8 + e.x * 0.1) * 2;
    ctx.fillRect(e.x, e.y + wobble, e.w, e.h);
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x + 6, e.y + 8 + wobble, 5, 5);
    ctx.fillRect(e.x + e.w - 11, e.y + 8 + wobble, 5, 5);
    ctx.shadowBlur = 0;
  }

  function render(): void {
    clear(ctx, W, H);

    // Stars
    ctx.fillStyle = '#222';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 73) % W;
      const sy = (i * 41 + animFrame * 20) % H;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Player ship
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(player.x + player.w / 2, player.y);
    ctx.lineTo(player.x, player.y + player.h);
    ctx.lineTo(player.x + player.w, player.y + player.h);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    enemies.forEach((e) => drawAlien(e, animFrame));
    bullets.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    enemyBullets.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;
    });

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
      resetPlayer();
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
