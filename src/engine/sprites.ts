/** Simple canvas-drawn sprites for retro games */

export function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const cx = x + w / 2;
  const headR = w * 0.22;
  const headY = y + headR + 2;

  ctx.save();
  ctx.shadowColor = '#ffcc88';
  ctx.shadowBlur = 8;

  // Head
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#553311';
  ctx.beginPath();
  ctx.arc(cx, headY - 2, headR * 0.9, Math.PI, Math.PI * 2);
  ctx.fill();

  // Body / jacket
  ctx.fillStyle = '#3366ff';
  ctx.fillRect(x + w * 0.2, headY + headR - 2, w * 0.6, h * 0.38);

  // Legs
  ctx.fillStyle = '#222244';
  ctx.fillRect(x + w * 0.25, headY + headR + h * 0.32, w * 0.18, h * 0.28);
  ctx.fillRect(x + w * 0.57, headY + headR + h * 0.32, w * 0.18, h * 0.28);

  // Shoes
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(x + w * 0.2, y + h - 6, w * 0.25, 6);
  ctx.fillRect(x + w * 0.55, y + h - 6, w * 0.25, 6);

  ctx.restore();
}

export function drawDelorean(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facingRight: boolean,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (!facingRight) ctx.scale(-1, 1);

  ctx.shadowColor = '#c0c0c0';
  ctx.shadowBlur = 10;

  // Body - stainless wedge
  ctx.fillStyle = '#b8bcc4';
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, h * 0.2);
  ctx.lineTo(w * 0.38, h * 0.2);
  ctx.lineTo(w * 0.45, h * 0.35);
  ctx.lineTo(w * 0.1, h * 0.42);
  ctx.lineTo(-w * 0.45, h * 0.35);
  ctx.closePath();
  ctx.fill();

  // Dark windshield band
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-w * 0.3, -h * 0.05, w * 0.55, h * 0.22);

  // Gull-wing line
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.05);
  ctx.lineTo(w * 0.15, h * 0.12);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-w * 0.22, h * 0.38, h * 0.14, 0, Math.PI * 2);
  ctx.arc(w * 0.22, h * 0.38, h * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Neon stripe
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, h * 0.28);
  ctx.lineTo(w * 0.3, h * 0.28);
  ctx.stroke();

  // Rear vents
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(-w * 0.44, h * 0.18, w * 0.06, h * 0.1);

  ctx.restore();
}

export function drawSpaceship(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  facingUp: boolean,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (!facingUp) ctx.rotate(Math.PI);

  ctx.shadowColor = color;
  ctx.shadowBlur = 14;

  // Main fuselage
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.48);
  ctx.lineTo(w * 0.22, h * 0.15);
  ctx.lineTo(w * 0.1, h * 0.42);
  ctx.lineTo(-w * 0.1, h * 0.42);
  ctx.lineTo(-w * 0.22, h * 0.15);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#88eeff';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.1, w * 0.08, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left wing
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, h * 0.05);
  ctx.lineTo(-w * 0.48, h * 0.35);
  ctx.lineTo(-w * 0.2, h * 0.3);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.05);
  ctx.lineTo(w * 0.48, h * 0.35);
  ctx.lineTo(w * 0.2, h * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Engine glow
  ctx.fillStyle = '#00ffff';
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 16;
  ctx.fillRect(-w * 0.06, h * 0.38, w * 0.12, h * 0.1);

  ctx.restore();
}

export function drawAlienShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  anim: number,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  const wobble = Math.sin(anim) * 3;
  ctx.translate(0, wobble);

  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;

  // Bug-like alien ship pointing down
  ctx.beginPath();
  ctx.moveTo(0, h * 0.4);
  ctx.lineTo(-w * 0.4, -h * 0.2);
  ctx.lineTo(-w * 0.15, -h * 0.35);
  ctx.lineTo(w * 0.15, -h * 0.35);
  ctx.lineTo(w * 0.4, -h * 0.2);
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(-w * 0.18, -h * 0.1, w * 0.1, h * 0.12);
  ctx.fillRect(w * 0.08, -h * 0.1, w * 0.1, h * 0.12);

  ctx.restore();
}

export function drawLadder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  const rungs = Math.floor(h / 14);
  for (let i = 1; i < rungs; i++) {
    const ry = y + (h / rungs) * i;
    ctx.beginPath();
    ctx.moveTo(x, ry);
    ctx.lineTo(x + w, ry);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}
