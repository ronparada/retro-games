import { createAsteroids } from './asteroids';
import { createBarrelRun } from './barrel-run';
import { createBreakout } from './breakout';
import { createHopper } from './hopper';
import { createMazeChomper } from './maze-chomper';
import { createPong } from './pong';
import { createSnake } from './snake';
import { createSpaceInvaders } from './space-invaders';
import { createStarSquadron } from './star-squadron';
import { createTetris } from './tetris';
import type { GameFactory, GameMeta } from '../engine/types';

export const gameFactories: GameFactory[] = [
  createSnake,
  createTetris,
  createSpaceInvaders,
  createBreakout,
  createPong,
  createAsteroids,
  createMazeChomper,
  createBarrelRun,
  createHopper,
  createStarSquadron,
];

export const comingSoonGames: GameMeta[] = [];

export function getAllGameMeta(): GameMeta[] {
  return gameFactories.map((f) => f().meta);
}
