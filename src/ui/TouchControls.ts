import type { Input } from '../engine/Input';
import type { Direction } from '../engine/Input';

export class TouchControls {
  private root: HTMLElement;
  private activeDir: Direction | null = null;
  private actionDown = false;
  private input: Input;
  private showAction: boolean;

  constructor(container: HTMLElement, input: Input, showAction = true) {
    this.input = input;
    this.showAction = showAction;
    this.root = document.createElement('div');
    this.root.className = 'touch-controls';
    this.build();
    container.appendChild(this.root);
  }

  private build(): void {
    const dpad = document.createElement('div');
    dpad.className = 'dpad';

    const dirs: { dir: Direction; label: string; cls: string }[] = [
      { dir: 'up', label: '▲', cls: 'dpad-up' },
      { dir: 'left', label: '◀', cls: 'dpad-left' },
      { dir: 'right', label: '▶', cls: 'dpad-right' },
      { dir: 'down', label: '▼', cls: 'dpad-down' },
    ];

    dirs.forEach(({ dir, label, cls }) => {
      const btn = document.createElement('button');
      btn.className = `dpad-btn ${cls}`;
      btn.textContent = label;
      btn.setAttribute('aria-label', dir);
      this.bindHold(btn, () => { this.activeDir = dir; }, () => { if (this.activeDir === dir) this.activeDir = null; });
      dpad.appendChild(btn);
    });

    this.root.appendChild(dpad);

    if (this.showAction) {
      const action = document.createElement('button');
      action.className = 'action-btn';
      action.textContent = 'FIRE';
      this.bindHold(action, () => { this.actionDown = true; }, () => { this.actionDown = false; });
      this.root.appendChild(action);
    }
  }

  private bindHold(el: HTMLElement, down: () => void, up: () => void): void {
    const start = (e: Event) => { e.preventDefault(); down(); this.sync(); };
    const end = () => { up(); this.sync(); };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  }

  private sync(): void {
    this.input.setTouchDirection(this.activeDir);
    this.input.setAction(this.actionDown);
  }

  destroy(): void {
    this.root.remove();
    this.activeDir = null;
    this.actionDown = false;
  }
}
