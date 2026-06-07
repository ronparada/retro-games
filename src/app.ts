import { fitCanvas } from './engine/canvas';
import { Input } from './engine/Input';
import type { GameInstance, GameMeta, GameState } from './engine/types';
import { gameFactories } from './games';
import { TouchControls } from './ui/TouchControls';

export class App {
  private root: HTMLElement;
  private currentGame: GameInstance | null = null;
  private touchControls: TouchControls | null = null;
  private gameState: GameState = { score: 0, highScore: 0, status: 'idle' };
  private resizeObserver: ResizeObserver | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.renderHome();
  }

  private renderHome(): void {
    this.cleanupGame();
    const allGames = gameFactories.map((f) => f().meta);

    this.root.innerHTML = `
      <div class="home">
        <header class="home-header">
          <div class="logo-glow">RETRO ARCADE</div>
          <p class="subtitle">Neon classics · Free · iOS & Android</p>
        </header>
        <div class="game-grid">
          ${allGames.map((g) => this.gameCard(g)).join('')}
        </div>
        <footer class="home-footer">
          <span>${gameFactories.length} games · All playable</span>
        </footer>
      </div>
    `;

    this.root.querySelectorAll('[data-game]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.game!;
        if ((el as HTMLElement).dataset.status === 'ready') {
          this.launchGame(id);
        }
      });
    });
  }

  private gameCard(g: GameMeta): string {
    const disabled = g.status === 'coming-soon';
    const hi = disabled ? '' : `<span class="hi-score">HI ${this.getStoredHi(g.id)}</span>`;
    return `
      <button class="game-card ${disabled ? 'disabled' : ''}" data-game="${g.id}" data-status="${g.status}" style="--accent:${g.color}">
        <span class="card-icon">${g.icon}</span>
        <span class="card-name">${g.name}</span>
        <span class="card-tag">${disabled ? 'Coming Soon' : g.tagline}</span>
        ${hi}
      </button>
    `;
  }

  private getStoredHi(id: string): number {
    return Number(localStorage.getItem('retro-arcade-hi-' + id) ?? 0);
  }

  private launchGame(id: string): void {
    const factory = gameFactories.find((f) => f().meta.id === id);
    if (!factory) return;

    this.cleanupGame();
    const game = factory();
    this.currentGame = game;

    this.root.innerHTML = `
      <div class="game-screen">
        <div class="game-hud">
          <button class="back-btn" id="backBtn">←</button>
          <div class="hud-center">
            <span class="hud-title">${game.meta.name}</span>
            <span class="hud-score" id="hudScore">0</span>
          </div>
          <button class="pause-btn" id="pauseBtn">⏸</button>
        </div>
        <div class="canvas-wrap" id="canvasWrap">
          <canvas id="gameCanvas"></canvas>
        </div>
        <div class="game-controls" id="gameControls">
          <button class="start-btn" id="startBtn">START</button>
        </div>
        <div class="touch-area" id="touchArea"></div>
        <div class="overlay hidden" id="overlay">
          <div class="overlay-box">
            <h2 id="overlayTitle">GAME OVER</h2>
            <p id="overlayScore"></p>
            <button class="start-btn" id="retryBtn">PLAY AGAIN</button>
            <button class="ghost-btn" id="menuBtn">MENU</button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const wrap = document.getElementById('canvasWrap')!;
    const touchArea = document.getElementById('touchArea')!;
    const overlay = document.getElementById('overlay')!;
    const input = new Input();

    const needsAction = ['space-invaders', 'tetris', 'asteroids', 'star-squadron', 'barrel-run'].includes(id);
    this.touchControls = new TouchControls(touchArea, input, needsAction);

    const fit = () => fitCanvas(canvas, canvas.width / canvas.height);
    fit();
    this.resizeObserver = new ResizeObserver(fit);
    this.resizeObserver.observe(wrap);

    game.init(canvas, (state) => {
      this.gameState = state;
      this.updateHud(state);
      if (state.status === 'gameover') this.showOverlay(state);
      else overlay.classList.add('hidden');
    }, input);

    document.getElementById('backBtn')!.onclick = () => this.renderHome();
    document.getElementById('menuBtn')!.onclick = () => this.renderHome();

    const startBtn = document.getElementById('startBtn')!;
    startBtn.onclick = () => {
      game.start();
      startBtn.classList.add('hidden');
      document.getElementById('gameControls')!.classList.add('playing');
    };

    document.getElementById('retryBtn')!.onclick = () => {
      overlay.classList.add('hidden');
      game.start();
    };

    document.getElementById('pauseBtn')!.onclick = () => {
      if (this.gameState.status === 'playing') {
        game.pause();
        this.showPauseOverlay();
      } else if (this.gameState.status === 'paused') {
        overlay.classList.add('hidden');
        game.resume();
      }
    };
  }

  private updateHud(state: GameState): void {
    const scoreEl = document.getElementById('hudScore');
    if (!scoreEl) return;

    let text = `${state.score}`;
    if (state.extra?.level) text += ` · LVL ${state.extra.level}`;
    if (state.extra?.lives !== undefined) text += ` · ♥ ${state.extra.lives}`;
    if (state.extra?.aiScore !== undefined) text += ` · ${state.score}-${state.extra.aiScore}`;
    scoreEl.textContent = text;
  }

  private showOverlay(state: GameState): void {
    const overlay = document.getElementById('overlay')!;
    const title = document.getElementById('overlayTitle')!;
    const score = document.getElementById('overlayScore')!;
    title.textContent = 'GAME OVER';
    const newHi = state.score > state.highScore;
    score.textContent = `Score: ${state.score}${newHi ? ' · NEW HIGH SCORE!' : ` · Best: ${Math.max(state.score, state.highScore)}`}`;
    overlay.classList.remove('hidden');
  }

  private showPauseOverlay(): void {
    const overlay = document.getElementById('overlay')!;
    document.getElementById('overlayTitle')!.textContent = 'PAUSED';
    document.getElementById('overlayScore')!.textContent = 'Tap resume or press P';
    document.getElementById('retryBtn')!.textContent = 'RESUME';
    document.getElementById('retryBtn')!.onclick = () => {
      overlay.classList.add('hidden');
      this.currentGame?.resume();
      document.getElementById('retryBtn')!.textContent = 'PLAY AGAIN';
    };
    overlay.classList.remove('hidden');
  }

  private cleanupGame(): void {
    this.resizeObserver?.disconnect();
    this.touchControls?.destroy();
    this.currentGame?.destroy();
    this.currentGame = null;
    this.touchControls = null;
  }
}
