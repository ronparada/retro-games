import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import type { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import { drawKid, drawLadder } from '../engine/sprites';
import type { GameFactory, GameState } from '../engine/types';

type Platform = { x: number; y: number; w: number; h: number; color: string; level: number };
type Ladder = { x: number; y: number; w: number; h: number; fromLevel: number };
type Barrel = { x: number; y: number; w: number; h: number; vx: number; vy: number; rot: number; level: number };

export const createBarrelRun: GameFactory = () => {
  const meta = {
    id: 'barrel-run',
    name: 'Barrel Run',
    tagline: 'Climb to victory',
    icon: '🦍',
    color: '#cc6600',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 560;

  let hero = { x: 30, y: 0, w: 22, h: 30, vx: 0, vy: 0, onGround: false, dir: 1, level: 0, climbing: false };
  let boss = { x: 30, y: 50, w: 44, h: 44, anim: 0 };
  let platforms: Platform[] = [];
  let ladders: Ladder[] = [];
  let barrels: Barrel[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let barrelTimer = 0;
  let status: GameState['status'] = 'idle';

  const LEVEL_Y = [H - 50, H - 140, H - 230, H - 320, H - 410, 90];

  function emit(): void {
    onStateChange({
      score, highScore: ScoreManager.getHighScore(meta.id), status,
      extra: { lives, level },
    });
  }

  function buildLevel(): void {
    platforms = [];
    ladders = [];

    // Staggered platforms like classic arcade - alternating sides with gaps
    const layouts = [
      { x: 0, w: W },           // ground
      { x: 0, w: W * 0.55 },    // level 1 left
      { x: W * 0.45, w: W * 0.55 }, // level 2 right
      { x: 0, w: W * 0.55 },    // level 3 left
      { x: W * 0.45, w: W * 0.55 }, // level 4 right
      { x: W * 0.2, w: W * 0.6 },   // top goal
    ];

    layouts.forEach((layout, i) => {
      platforms.push({
        x: layout.x, y: LEVEL_Y[i], w: layout.w, h: 14,
        color: i % 2 === 0 ? '#8b4513' : '#777',
        level: i,
      });
    });

    // Ladders between levels on the open side
    for (let i = 0; i < layouts.length - 1; i++) {
      const ladderX = i % 2 === 0 ? W * 0.52 : 8;
      ladders.push({
        x: ladderX, y: LEVEL_Y[i + 1] + 14,
        w: 18, h: LEVEL_Y[i] - LEVEL_Y[i + 1] - 14,
        fromLevel: i,
      });
    }
  }

  function getPlatformAt(lv: number): Platform | undefined {
    return platforms.find((p) => p.level === lv);
  }

  function snapHeroToLevel(lv: number): void {
    const p = getPlatformAt(lv);
    if (!p) return;
    hero.level = lv;
    hero.y = p.y - hero.h;
    hero.climbing = false;
    hero.vy = 0;
  }

  function spawnBarrel(): void {
    const targetLevel = Math.floor(Math.random() * 3) + 1;
    const p = getPlatformAt(targetLevel);
    if (!p) return;
    barrels.push({
      x: boss.x + boss.w,
      y: p.y - 16,
      w: 16, h: 16,
      vx: 90 + level * 8, vy: 0, rot: 0,
      level: targetLevel,
    });
  }

  function reset(): void {
    hero = { x: 30, y: 0, w: 22, h: 30, vx: 0, vy: 0, onGround: false, dir: 1, level: 0, climbing: false };
    score = 0;
    lives = 3;
    level = 1;
    barrels = [];
    barrelTimer = 0;
    buildLevel();
    snapHeroToLevel(0);
    emit();
  }

  function collide(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function onLadder(): Ladder | undefined {
    return ladders.find((l) =>
      hero.x + hero.w > l.x && hero.x < l.x + l.w &&
      hero.y + hero.h > l.y && hero.y < l.y + l.h + 10,
    );
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
      hero.x = 30;
      snapHeroToLevel(0);
    }
  }

  function update(dt: number): void {
    if (status !== 'playing') return;
    if (input.isPause()) { status = 'paused'; loop.pause(); emit(); return; }

    const moveSpeed = 180;
    const ladder = onLadder();

    if (input.isUp() && ladder) {
      hero.climbing = true;
      hero.vy = -140;
      hero.vx = 0;
    } else if (input.isDown() && ladder) {
      hero.climbing = true;
      hero.vy = 140;
      hero.vx = 0;
    } else {
      hero.climbing = false;
      hero.vx = 0;
      if (input.isLeft()) { hero.vx = -moveSpeed; hero.dir = -1; }
      if (input.isRight()) { hero.vx = moveSpeed; hero.dir = 1; }

      if (input.isActionJustPressed() && hero.onGround) {
        hero.vy = -280;
        hero.onGround = false;
      }

      if (!hero.onGround) hero.vy += 500 * dt;
    }

    hero.x += hero.vx * dt;
    hero.y += hero.vy * dt;
    hero.x = Math.max(0, Math.min(W - hero.w, hero.x));

    // Land on current or lower platform
    hero.onGround = false;
    const curPlatform = getPlatformAt(hero.level);
    platforms.forEach((p) => {
      if (hero.vy >= 0 &&
          hero.y + hero.h >= p.y && hero.y + hero.h <= p.y + p.h + 12 &&
          hero.x + hero.w > p.x + 4 && hero.x < p.x + p.w - 4) {
        hero.y = p.y - hero.h;
        hero.vy = 0;
        hero.onGround = true;
        hero.level = p.level;
        hero.climbing = false;
      }
    });

    // Climbing: snap to next level when reaching it
    if (hero.climbing && ladder) {
      const above = getPlatformAt(ladder.fromLevel + 1);
      const below = getPlatformAt(ladder.fromLevel);
      if (hero.vy < 0 && above && hero.y + hero.h <= above.y + above.h + 4) {
        snapHeroToLevel(above.level);
        hero.x = ladder.x + 2;
      }
      if (hero.vy > 0 && below && hero.y + hero.h >= below.y - 4) {
        snapHeroToLevel(below.level);
        hero.x = ladder.x + 2;
      }
    }

    // Reached top
    if (hero.level >= 5) {
      score += 1000;
      level++;
      barrels = [];
      buildLevel();
      hero.x = 30;
      snapHeroToLevel(0);
      emit();
    }

    // Fall off platform
    if (curPlatform && !hero.climbing && hero.onGround) {
      const onPlat = hero.x + hero.w > curPlatform.x + 4 && hero.x < curPlatform.x + curPlatform.w - 4;
      if (!onPlat && hero.y + hero.h >= curPlatform.y) {
        hero.onGround = false;
      }
    }

    if (hero.y > H) die();

    barrelTimer -= dt;
    if (barrelTimer <= 0) {
      spawnBarrel();
      barrelTimer = Math.max(0.7, 1.8 - level * 0.08);
    }

    barrels.forEach((b) => {
      const p = getPlatformAt(b.level);
      if (!p) return;
      b.x += b.vx * dt;
      b.rot += 5 * dt;

      if (b.x > p.x + p.w) {
        // Roll off edge - drop to next level
        if (b.level > 0) {
          b.level--;
          const lower = getPlatformAt(b.level);
          if (lower) {
            b.y = lower.y - b.h;
            b.vx = (b.vx > 0 ? 1 : -1) * Math.abs(b.vx) * 0.8;
          }
        } else {
          b.x = -30;
        }
      }
      if (b.x < p.x - b.w) b.x = p.x - b.w;
    });

    barrels = barrels.filter((b) => {
      if (collide(hero.x, hero.y, hero.w, hero.h, b.x, b.y, b.w, b.h)) {
        die();
        return false;
      }
      return b.x > -40;
    });

    boss.anim += dt * 4;
    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    // Background girders
    ctx.strokeStyle = '#222';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, LEVEL_Y[i]);
      ctx.lineTo(W, LEVEL_Y[i]);
      ctx.stroke();
    }

    ladders.forEach((l) => drawLadder(ctx, l.x, l.y, l.w, l.h));

    platforms.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // Rivets
      ctx.fillStyle = '#555';
      for (let rx = p.x + 10; rx < p.x + p.w; rx += 30) {
        ctx.fillRect(rx, p.y + 4, 4, 4);
      }
    });
    ctx.shadowBlur = 0;

    // Boss ape
    ctx.save();
    ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
    ctx.rotate(Math.sin(boss.anim) * 0.08);
    ctx.fillStyle = '#8b4513';
    ctx.shadowColor = '#cc6600';
    ctx.shadowBlur = 10;
    ctx.fillRect(-boss.w / 2, -boss.h / 2, boss.w, boss.h);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(-8, -12, 16, 10);
    ctx.restore();

    barrels.forEach((b) => {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.rotate(b.rot);
      ctx.fillStyle = '#aa5500';
      ctx.strokeStyle = '#663300';
      ctx.lineWidth = 2;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    });

    ctx.save();
    ctx.translate(hero.x + (hero.dir < 0 ? hero.w : 0), hero.y);
    ctx.scale(hero.dir, 1);
    drawKid(ctx, 0, 0, hero.w, hero.h);
    ctx.restore();

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
      buildLevel();
      status = 'idle'; emit();
    },
    start() { reset(); status = 'playing'; input.attach(); loop.start(); emit(); },
    stop() { loop.stop(); input.detach(); status = 'idle'; emit(); },
    pause() { if (status === 'playing') { status = 'paused'; loop.pause(); emit(); } },
    resume() { if (status === 'paused') { status = 'playing'; loop.resume(); emit(); } },
    destroy() { loop.stop(); input.detach(); },
  };
};
