import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import type { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

// 0=empty 1=wall 2=dot 3=power pellet — col 10 openings connect left/right halves
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,2,1,1,1,1,1,1,2,2,2,1,1,1,1,1,2,1,1],
  [1,1,2,1,1,1,1,1,1,2,2,2,1,1,1,1,1,2,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const GHOST_PEN = { col: 10, row: 5 };
const POWER_DURATION = 8;

type Dir = 'right' | 'left' | 'up' | 'down' | 'none';
type Ghost = { col: number; row: number; px: number; py: number; color: string; dir: Dir; eaten: boolean };
type Dot = { col: number; row: number; power: boolean };

export const createMazeChomper: GameFactory = () => {
  const meta = {
    id: 'maze-chomper',
    name: 'Maze Chomper',
    tagline: 'Eat dots, dodge ghosts',
    icon: '👻',
    color: '#ffee00',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const COLS = 20;
  const ROWS = 10;
  const CELL = 28;
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const SPEED = 130;

  const START = { col: 2, row: 8 };

  let chomper = {
    col: START.col, row: START.row, px: 0, py: 0,
    dir: 'none' as Dir,
    queued: 'none' as Dir,
    targetCol: START.col, targetRow: START.row,
    moving: false,
    mouth: 0,
    mouthDir: 0,
  };
  let ghosts: Ghost[] = [];
  let dots: Dot[] = [];
  let score = 0;
  let lives = 3;
  let powered = false;
  let powerTimer = 0;
  let status: GameState['status'] = 'idle';

  const GHOST_COLORS = ['#ff4444', '#44ffff', '#ff44ff', '#ffaa00'];

  function cellCenter(col: number, row: number): { px: number; py: number } {
    return { px: col * CELL + CELL / 2, py: row * CELL + CELL / 2 };
  }

  function isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return MAZE[row][col] !== 1;
  }

  function dirDelta(d: Dir): { dc: number; dr: number } {
    if (d === 'right') return { dc: 1, dr: 0 };
    if (d === 'left') return { dc: -1, dr: 0 };
    if (d === 'up') return { dc: 0, dr: -1 };
    if (d === 'down') return { dc: 0, dr: 1 };
    return { dc: 0, dr: 0 };
  }

  function canGo(col: number, row: number, d: Dir): boolean {
    if (d === 'none') return false;
    const { dc, dr } = dirDelta(d);
    return isWalkable(col + dc, row + dr);
  }

  function dirToAngle(d: Dir): number {
    if (d === 'right') return 0;
    if (d === 'left') return Math.PI;
    if (d === 'up') return -Math.PI / 2;
    return Math.PI / 2;
  }

  function pickDir(): Dir {
    if (canGo(chomper.col, chomper.row, chomper.queued)) return chomper.queued;
    if (canGo(chomper.col, chomper.row, chomper.dir)) return chomper.dir;
    return 'none';
  }

  function emit(): void {
    onStateChange({
      score, highScore: ScoreManager.getHighScore(meta.id), status,
      extra: { lives },
    });
  }

  function buildDots(): void {
    dots = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = MAZE[row][col];
        if (cell === 2) dots.push({ col, row, power: false });
        if (cell === 3) dots.push({ col, row, power: true });
      }
    }
  }

  function sendGhostToPen(g: Ghost): void {
    const c = cellCenter(GHOST_PEN.col, GHOST_PEN.row);
    g.col = GHOST_PEN.col;
    g.row = GHOST_PEN.row;
    g.px = c.px;
    g.py = c.py;
    g.eaten = false;
    g.dir = 'left';
  }

  function resetGhosts(): void {
    ghosts = GHOST_COLORS.map((color, i) => {
      const col = GHOST_PEN.col + (i % 3) - 1;
      const row = GHOST_PEN.row;
      const c = cellCenter(col, row);
      return { col, row, px: c.px, py: c.py, color, dir: 'left' as Dir, eaten: false };
    });
  }

  function reset(): void {
    const start = cellCenter(START.col, START.row);
    chomper = {
      col: START.col, row: START.row, px: start.px, py: start.py,
      dir: 'none', queued: 'none',
      targetCol: START.col, targetRow: START.row,
      moving: false, mouth: 0, mouthDir: 0,
    };
    score = 0;
    lives = 3;
    powered = false;
    powerTimer = 0;
    buildDots();
    resetGhosts();
    emit();
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
      const start = cellCenter(START.col, START.row);
      chomper = {
        col: START.col, row: START.row, px: start.px, py: start.py,
        dir: 'none', queued: 'none',
        targetCol: START.col, targetRow: START.row,
        moving: false, mouth: 0, mouthDir: 0,
      };
      resetGhosts();
      powered = false;
      powerTimer = 0;
    }
  }

  function beginMove(d: Dir): void {
    const { dc, dr } = dirDelta(d);
    chomper.dir = d;
    chomper.targetCol = chomper.col + dc;
    chomper.targetRow = chomper.row + dr;
    chomper.moving = true;
    chomper.mouthDir = dirToAngle(d);
  }

  function eatDotsAt(col: number, row: number): void {
    let ate = false;
    dots = dots.filter((d) => {
      if (d.col === col && d.row === row) {
        score += d.power ? 50 : 10;
        if (d.power) {
          powered = true;
          powerTimer = POWER_DURATION;
          ghosts.forEach((g) => { g.eaten = false; });
        }
        ate = true;
        return false;
      }
      return true;
    });
    if (ate) emit();
  }

  function moveGhost(g: Ghost, dt: number): void {
    if (g.eaten) return;

    const choices: Dir[] = ['up', 'down', 'left', 'right'];
    if (!g.dir || g.dir === 'none' || Math.random() < 0.02) {
      const valid = choices.filter((d) => canGo(g.col, g.row, d));
      if (valid.length) g.dir = valid[Math.floor(Math.random() * valid.length)];
    }
    if (powered && powerTimer > 1) {
      // flee toward opposite of chomper
      const dx = g.px - chomper.px;
      const dy = g.py - chomper.py;
      if (Math.abs(dx) > Math.abs(dy)) g.dir = dx > 0 ? 'right' : 'left';
      else g.dir = dy > 0 ? 'down' : 'up';
      if (!canGo(g.col, g.row, g.dir)) {
        const valid = choices.filter((d) => canGo(g.col, g.row, d));
        if (valid.length) g.dir = valid[0];
      }
    }

    const center = cellCenter(g.col, g.row);
    const { dc, dr } = dirDelta(g.dir);
    const tx = center.px + dc * CELL;
    const ty = center.py + dr * CELL;

    if (!canGo(g.col, g.row, g.dir)) return;

    const dx = tx - g.px;
    const dy = ty - g.py;
    const dist = Math.hypot(dx, dy);
    const step = (powered && powerTimer > 1 ? 55 : 70) * dt;

    if (dist < 2) {
      g.col += dc;
      g.row += dr;
      const nc = cellCenter(g.col, g.row);
      g.px = nc.px;
      g.py = nc.py;
    } else if (dist > 0) {
      g.px += (dx / dist) * Math.min(step, dist);
      g.py += (dy / dist) * Math.min(step, dist);
    }
  }

  function update(dt: number): void {
    if (status !== 'playing') return;
    if (input.isPause()) { status = 'paused'; loop.pause(); emit(); return; }

    if (input.isRight()) chomper.queued = 'right';
    else if (input.isLeft()) chomper.queued = 'left';
    else if (input.isUp()) chomper.queued = 'up';
    else if (input.isDown()) chomper.queued = 'down';

    if (!chomper.moving) {
      const center = cellCenter(chomper.col, chomper.row);
      chomper.px = center.px;
      chomper.py = center.py;
      eatDotsAt(chomper.col, chomper.row);

      const next = pickDir();
      if (next !== 'none') beginMove(next);
    } else {
      const target = cellCenter(chomper.targetCol, chomper.targetRow);
      const dx = target.px - chomper.px;
      const dy = target.py - chomper.py;
      const dist = Math.hypot(dx, dy);
      const step = SPEED * dt;

      if (dist <= step) {
        chomper.col = chomper.targetCol;
        chomper.row = chomper.targetRow;
        chomper.px = target.px;
        chomper.py = target.py;
        chomper.moving = false;
        eatDotsAt(chomper.col, chomper.row);

        const next = pickDir();
        if (next !== 'none') beginMove(next);
        else chomper.dir = 'none';
      } else {
        chomper.px += (dx / dist) * step;
        chomper.py += (dy / dist) * step;
      }
    }

    chomper.mouth += dt * 10;

    ghosts.forEach((g) => moveGhost(g, dt));

    if (powerTimer > 0) {
      powerTimer -= dt;
      if (powerTimer <= 0) powered = false;
    }

    ghosts.forEach((g) => {
      if (g.eaten) return;
      const dist = Math.hypot(g.px - chomper.px, g.py - chomper.py);
      if (dist >= 22) return;

      if (powered && powerTimer > 0.5) {
        g.eaten = true;
        sendGhostToPen(g);
        score += 200;
        emit();
      } else if (!powered) {
        die();
      }
    });

    if (dots.length === 0) buildDots();
    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (MAZE[row][col] === 1) {
          ctx.fillStyle = '#1122aa';
          ctx.shadowColor = '#4466ff';
          ctx.shadowBlur = 4;
          ctx.fillRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
    ctx.shadowBlur = 0;

    dots.forEach((d) => {
      const c = cellCenter(d.col, d.row);
      if (d.power) {
        const pulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(c.px, c.py, 8 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ffeeaa';
        ctx.beginPath();
        ctx.arc(c.px, c.py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ghosts.forEach((g) => {
      if (g.eaten) return;

      const scared = powered && powerTimer > 0;
      const flash = scared && Math.floor(powerTimer * 10) % 2 === 0;
      const bodyColor = scared ? (flash ? '#ffffff' : '#2244ff') : g.color;

      ctx.fillStyle = bodyColor;
      ctx.shadowColor = scared ? '#4488ff' : bodyColor;
      ctx.shadowBlur = scared ? 16 : 10;
      ctx.beginPath();
      ctx.arc(g.px, g.py, 11, 0, Math.PI * 2);
      ctx.fill();

      // Ghost wavy bottom
      ctx.fillStyle = bodyColor;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(g.px + i * 7, g.py + 9, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (scared && powerTimer < 2) {
        // Near end — show only eyes (about to recover)
        ctx.fillStyle = '#fff';
        ctx.fillRect(g.px - 5, g.py - 2, 4, 5);
        ctx.fillRect(g.px + 1, g.py - 2, 4, 5);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(g.px - 5, g.py - 3, 3, 4);
        ctx.fillRect(g.px + 2, g.py - 3, 3, 4);
        if (!scared) {
          ctx.fillStyle = '#00f';
          ctx.fillRect(g.px - 4, g.py - 2, 2, 3);
          ctx.fillRect(g.px + 3, g.py - 2, 2, 3);
        }
      }
    });

    const mouthA = 0.2 + Math.abs(Math.sin(chomper.mouth)) * 0.5;
    const faceDir = chomper.moving ? chomper.mouthDir : dirToAngle(chomper.queued !== 'none' ? chomper.queued : chomper.dir);
    ctx.fillStyle = '#ffee00';
    ctx.shadowColor = '#ffee00';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(chomper.px, chomper.py, 11, faceDir + mouthA, faceDir + Math.PI * 2 - mouthA);
    ctx.lineTo(chomper.px, chomper.py);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (status === 'idle') drawGlowText(ctx, 'TAP START', W / 2, H / 2, '#ff00ff', 10);
    else if (status === 'paused') drawGlowText(ctx, 'PAUSED', W / 2, H / 2, '#00ffff', 10);
    else if (status === 'gameover') {
      drawGlowText(ctx, 'GAME OVER', W / 2, H / 2 - 12, '#ff00ff', 8);
      drawGlowText(ctx, `${score}`, W / 2, H / 2 + 12, '#00ffff', 8);
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
