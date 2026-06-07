import { clear, drawGlowText } from '../engine/canvas';
import { GameLoop } from '../engine/GameLoop';
import { Input } from '../engine/Input';
import { ScoreManager } from '../engine/ScoreManager';
import type { GameFactory, GameState } from '../engine/types';

export const createPong: GameFactory = () => {
  const meta = {
    id: 'pong',
    name: 'Neon Pong',
    tagline: 'You vs the AI',
    icon: '🏓',
    color: '#ffffff',
    status: 'ready' as const,
  };

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let loop!: GameLoop;
  let input!: Input;
  let onStateChange!: (s: GameState) => void;

  const W = 400;
  const H = 560;

  let ball = { x: 200, y: 280, r: 8, vx: 200, vy: 160 };
  let player = { y: 230, h: 80, w: 10 };
  let ai = { y: 230, h: 80, w: 10 };
  let playerScore = 0;
  let aiScore = 0;
  let status: GameState['status'] = 'idle';

  function emit(): void {
    onStateChange({
      score: playerScore,
      highScore: ScoreManager.getHighScore(meta.id),
      status,
      extra: { aiScore },
    });
  }

  function resetBall(dir = 1): void {
    ball = {
      x: W / 2,
      y: H / 2,
      r: 8,
      vx: 220 * dir,
      vy: (Math.random() - 0.5) * 300,
    };
  }

  function reset(): void {
    player.y = H / 2 - player.h / 2;
    ai.y = H / 2 - ai.h / 2;
    playerScore = 0;
    aiScore = 0;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    emit();
  }

  function endGame(): void {
    status = 'gameover';
    loop.pause();
    ScoreManager.setHighScore(meta.id, playerScore);
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

    const speed = 360;
    if (input.isUp()) player.y = Math.max(0, player.y - speed * dt);
    if (input.isDown()) player.y = Math.min(H - player.h, player.y + speed * dt);

    // AI follows ball with slight lag
    const target = ball.y - ai.h / 2;
    const diff = target - ai.y;
    ai.y += Math.sign(diff) * Math.min(Math.abs(diff), 280 * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
    if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy *= -1; }

    const px = 16;
    const ax = W - 26;

    if (ball.vx < 0 && ball.x - ball.r < px + player.w && ball.y > player.y && ball.y < player.y + player.h) {
      ball.vx = Math.abs(ball.vx) * 1.04;
      ball.vy += (ball.y - (player.y + player.h / 2)) * 2;
    }
    if (ball.vx > 0 && ball.x + ball.r > ax && ball.y > ai.y && ball.y < ai.y + ai.h) {
      ball.vx = -Math.abs(ball.vx) * 1.04;
      ball.vy += (ball.y - (ai.y + ai.h / 2)) * 2;
    }

    if (ball.x < 0) {
      aiScore++;
      emit();
      if (aiScore >= 5) { endGame(); return; }
      resetBall(1);
    }
    if (ball.x > W) {
      playerScore++;
      emit();
      if (playerScore >= 5) { endGame(); return; }
      resetBall(-1);
    }

    input.endFrame();
  }

  function render(): void {
    clear(ctx, W, H);

    ctx.setLineDash([6, 14]);
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(16, player.y, player.w, player.h);

    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(W - 26, ai.y, ai.w, ai.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (status === 'idle') drawGlowText(ctx, 'TAP START', W / 2, H / 2, '#ff00ff', 12);
    else if (status === 'paused') drawGlowText(ctx, 'PAUSED', W / 2, H / 2, '#00ffff', 12);
    else if (status === 'gameover') {
      const won = playerScore > aiScore;
      drawGlowText(ctx, won ? 'YOU WIN!' : 'AI WINS', W / 2, H / 2 - 12, '#ff00ff', 10);
      drawGlowText(ctx, `${playerScore} - ${aiScore}`, W / 2, H / 2 + 12, '#00ffff', 10);
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
