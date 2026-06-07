import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

const PIECES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
];

const COLORS = ['#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];

export const createTetris: GameFactory = () => {
  const meta = {
    id: 'tetris',
    name: 'Block Drop',
    tagline: 'Stack, clear, survive',
    icon: '🧱',
    color: '#00f0f0',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const COLS = 10;
  const ROWS = 20;
  const CELL = 24;

  let board: number[][] = [];
  let boardColors: (string | null)[][] = [];
  let piece: number[][] = [];
  let pieceColor = '#fff';
  let px = 0;
  let py = 0;
  let score = 0;
  let level = 1;
  let dropTimer = 0;
  let dropInterval = 0.8;
  let status: GameState['status'] = 'idle';

  function emit(): void {
    onStateChange({
      score,
      highScore: ScoreManager.getHighScore(meta.id),
      status,
      extra: { level },
    });
  }

  function resetBoard(): void {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    boardColors = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function spawn(): void {
    const idx = Math.floor(Math.random() * PIECES.length);
    piece = PIECES[idx].map((row) => [...row]);
    pieceColor = COLORS[idx];
    px = Math.floor((COLS - piece[0].length) / 2);
    py = 0;
    if (collides()) endGame();
  }

  function collides(ox = 0, oy = 0, p = piece): boolean {
    for (let y = 0; y < p.length; y++) {
      for (let x = 0; x < p[y].length; x++) {
        if (!p[y][x]) continue;
        const nx = px + x + ox;
        const ny = py + y + oy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function merge(): void {
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x]) {
          board[py + y][px + x] = 1;
          boardColors[py + y][px + x] = pieceColor;
        }
      }
    }
  }

  function clearLines(): void {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((c) => c === 1)) {
        board.splice(y, 1);
        boardColors.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        boardColors.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      const points = [0, 100, 300, 500, 800][cleared] * level;
      score += points;
      if (score >= level * 1000) {
        level++;
        dropInterval = Math.max(0.15, 0.8 - (level - 1) * 0.07);
      }
      emit();
    }
  }

  function hardDrop(): void {
    while (!collides(0, 1)) py++;
    merge();
    clearLines();
    spawn();
  }

  function rotate(): void {
    const rotated = piece[0].map((_, i) => piece.map((row) => row[i]).reverse());
    const old = piece;
    piece = rotated;
    if (collides()) piece = old;
  }

  function update(dt: number): void {
    if (status !== 'playing') return;

    if (input.isPause()) {
      status = 'paused';
      loop.pause();
      emit();
      return;
    }

    if (input.isLeft()) {
      px--;
      if (collides()) px++;
    }
    if (input.isRight()) {
      px++;
      if (collides()) px--;
    }
    if (input.isDown()) {
      py++;
      if (collides()) {
        py--;
        merge();
        clearLines();
        spawn();
      }
    }
    if (input.isUp()) rotate();
    if (input.isActionJustPressed()) hardDrop();

    dropTimer += dt;
    if (dropTimer >= dropInterval) {
      dropTimer = 0;
      py++;
      if (collides()) {
        py--;
        merge();
        clearLines();
        spawn();
      }
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

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          ctx.shadowColor = boardColors[y][x]!;
          ctx.shadowBlur = 8;
          ctx.fillStyle = boardColors[y][x]!;
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
    ctx.shadowBlur = 0;

    if (piece.length) {
      ctx.shadowColor = pieceColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = pieceColor;
      for (let y = 0; y < piece.length; y++) {
        for (let x = 0; x < piece[y].length; x++) {
          if (piece[y][x]) {
            ctx.fillRect((px + x) * CELL + 1, (py + y) * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }
      ctx.shadowBlur = 0;
    }

    if (status === 'idle') drawGlowText(ctx, 'TAP START', canvas.width / 2, canvas.height / 2, '#ff00ff', 12);
    else if (status === 'paused') drawGlowText(ctx, 'PAUSED', canvas.width / 2, canvas.height / 2, '#00ffff', 12);
    else if (status === 'gameover') {
      drawGlowText(ctx, 'GAME OVER', canvas.width / 2, canvas.height / 2 - 12, '#ff00ff', 10);
      drawGlowText(ctx, `${score}`, canvas.width / 2, canvas.height / 2 + 12, '#00ffff', 10);
    }
  }

  return {
    meta,
    init(c, cb, sharedInput) {
      canvas = c;
      ctx = canvas.getContext('2d')!;
      canvas.width = COLS * CELL;
      canvas.height = ROWS * CELL;
      onStateChange = cb;
      input = sharedInput;
      loop = new GameLoop(update, render);
      resetBoard();
      score = 0;
      level = 1;
      dropInterval = 0.8;
      status = 'idle';
      emit();
    },
    start() {
      resetBoard();
      score = 0;
      level = 1;
      dropInterval = 0.8;
      dropTimer = 0;
      spawn();
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
