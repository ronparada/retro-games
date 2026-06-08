export type Direction = 'up' | 'down' | 'left' | 'right';

export class Input {
  private keys = new Set<string>();
  private touchDirection: Direction | null = null;
  private actionPressed = false;
  private actionJustPressed = false;
  private prevAction = false;
  private prevSpace = false;

  private keyHandler = (e: KeyboardEvent) => {
    if (e.type === 'keydown') {
      this.keys.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    } else {
      this.keys.delete(e.key);
    }
  };

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('keyup', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('keyup', this.keyHandler);
    this.keys.clear();
    this.touchDirection = null;
    this.actionPressed = false;
    this.actionJustPressed = false;
    this.prevSpace = false;
  }

  setTouchDirection(dir: Direction | null): void {
    this.touchDirection = dir;
  }

  setAction(pressed: boolean): void {
    this.actionPressed = pressed;
  }

  endFrame(): void {
    this.actionJustPressed = this.actionPressed && !this.prevAction;
    this.prevAction = this.actionPressed;
    this.prevSpace = this.keys.has(' ');
  }

  isUp(): boolean {
    return this.keys.has('ArrowUp') || this.keys.has('w') || this.touchDirection === 'up';
  }

  isDown(): boolean {
    return this.keys.has('ArrowDown') || this.keys.has('s') || this.touchDirection === 'down';
  }

  isLeft(): boolean {
    return this.keys.has('ArrowLeft') || this.keys.has('a') || this.touchDirection === 'left';
  }

  isRight(): boolean {
    return this.keys.has('ArrowRight') || this.keys.has('d') || this.touchDirection === 'right';
  }

  isAction(): boolean {
    return this.keys.has(' ') || this.actionPressed;
  }

  isActionJustPressed(): boolean {
    const spaceJust = this.keys.has(' ') && !this.prevSpace;
    return spaceJust || this.actionJustPressed;
  }

  isPause(): boolean {
    return this.keys.has('p') || this.keys.has('Escape');
  }
}
