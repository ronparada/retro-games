import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

type Point = { x: number; y: number };

export const createSnake: GameFactory = () => {
  const meta = {
    id: 'snake',
    name: 'Neon Serpent',
    tagline: 'Classic snake, neon glow',
    icon: '🐍',
    color: '#00ff88',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const GRID = 20;
  const COLS = 20;
  const ROWS = 28;

  let snake: Point[] = [];
  let food: Point = { x: 0, y: 0 };
  let direction: Direction = 'right';
  let nextDirection: Direction = 'right';
  let score = 0;
  let moveTimer = 0;
  let moveInterval = 0.14;
  let status: GameState['status'] = 'idle';

  type Direction = 'up' | 'down' | 'left' | 'right';

  function emit(): void {
    onStateChange({
      score,
      highScore: ScoreManager.getHighScore(meta.id),
      status,
    });
  }

  function reset(): void {
    snake = [
      { x: 10, y: 14 },
      { x: 9, y: 14 },
      { x: 8, y: 14 },
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    moveTimer = 0;
    moveInterval = 0.14;
    spawnFood();
    emit();
  }

  function spawnFood(): void {
    do {
      food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function update(dt: number): void {
    if (status !== 'playing') return;

    if (input.isPause()) {
      status = 'paused';
      loop.pause();
      emit();
      return;
    }

    if (input.isUp() && direction !== 'down') nextDirection = 'up';
    if (input.isDown() && direction !== 'up') nextDirection = 'down';
    if (input.isLeft() && direction !== 'right') nextDirection = 'left';
    if (input.isRight() && direction !== 'left') nextDirection = 'right';

    moveTimer += dt;
    if (moveTimer < moveInterval) {
      input.endFrame();
      return;
    }
    moveTimer = 0;
    direction = nextDirection;

    const head = { ...snake[0] };
    if (direction === 'up') head.y--;
    if (direction === 'down') head.y++;
    if (direction === 'left') head.x--;
    if (direction === 'right') head.x++;

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      endGame();
      return;
    }
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      moveInterval = Math.max(0.06, moveInterval - 0.004);
      spawnFood();
      emit();
    } else {
      snake.pop();
    }

    input.endFrame();
  }

  function endGame(): void {
    status = 'gameover';
    loop.pause();
    ScoreManager.setHighScore(meta.id, score);
    emit();
  }

  function render(): void {
    clear(ctx, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * GRID, 0);
      ctx.lineTo(x * GRID, ROWS * GRID);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * GRID);
      ctx.lineTo(COLS * GRID, y * GRID);
      ctx.stroke();
    }

    snake.forEach((seg, i) => {
      const glow = i === 0 ? '#00ff88' : '#00cc66';
      ctx.shadowColor = glow;
      ctx.shadowBlur = i === 0 ? 14 : 6;
      ctx.fillStyle = glow;
      ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2);
    });

    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.arc(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2, GRID / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (status === 'idle') {
      drawGlowText(ctx, 'TAP START', canvas.width / 2, canvas.height / 2, '#ff00ff', 14);
    } else if (status === 'paused') {
      drawGlowText(ctx, 'PAUSED', canvas.width / 2, canvas.height / 2, '#00ffff', 14);
    } else if (status === 'gameover') {
      drawGlowText(ctx, 'GAME OVER', canvas.width / 2, canvas.height / 2 - 16, '#ff00ff', 12);
      drawGlowText(ctx, `SCORE ${score}`, canvas.width / 2, canvas.height / 2 + 16, '#00ffff', 10);
    }
  }

  return {
    meta,
    init(c, cb, sharedInput) {
      canvas = c;
      ctx = canvas.getContext('2d')!;
      canvas.width = COLS * GRID;
      canvas.height = ROWS * GRID;
      onStateChange = cb;
      input = sharedInput;
      loop = new GameLoop(update, render);
      reset();
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
