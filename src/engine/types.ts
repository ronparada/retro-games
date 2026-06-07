export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  status: 'ready' | 'coming-soon';
}

export interface GameInstance {
  meta: GameMeta;
  init(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void, input: Input): void;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface GameState {
  score: number;
  highScore: number;
  status: 'idle' | 'playing' | 'paused' | 'gameover';
  extra?: Record<string, string | number>;
}

import type { Input } from './Input';

export type GameFactory = () => GameInstance;
