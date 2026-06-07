export function fitCanvas(canvas: HTMLCanvasElement, aspect = 1): { w: number; h: number; scale: number } {
  const container = canvas.parentElement;
  if (!container) return { w: canvas.width, h: canvas.height, scale: 1 };

  const maxW = container.clientWidth - 8;
  const maxH = container.clientHeight - 8;

  let w = maxW;
  let h = w / aspect;

  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const scale = w / canvas.width;
  return { w, h, scale };
}

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
}

export function drawGlowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 16,
): void {
  ctx.save();
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
