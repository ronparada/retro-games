const PREFIX = 'retro-arcade-hi-';

export class ScoreManager {
  static getHighScore(gameId: string): number {
    return Number(localStorage.getItem(PREFIX + gameId) ?? 0);
  }

  static setHighScore(gameId: string, score: number): boolean {
    const current = ScoreManager.getHighScore(gameId);
    if (score > current) {
      localStorage.setItem(PREFIX + gameId, String(score));
      return true;
    }
    return false;
  }
}
