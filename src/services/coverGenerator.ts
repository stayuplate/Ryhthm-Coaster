/**
 * Procedural Japanese Modernist Cover Art Generator
 * 
 * Generates high-fidelity artwork matching the game's aesthetic:
 * Sacred Celestial Geometry, Astrolabe Rings, Sumi Ink, Cinnabar Red & Solar Ochre.
 */

export interface CoverOptions {
  title: string;
  artist: string;
  bpm: number;
  durationFormatted: string;
}

/**
 * Creates a 600x600 procedural album cover and returns a data URL.
 */
export function generateProceduralCover(options: CoverOptions): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Obsidian / Sumi Ink Background
  ctx.fillStyle = '#0b0b0e';
  ctx.fillRect(0, 0, 600, 600);

  // Subtle radial gradient
  const bgRad = ctx.createRadialGradient(300, 300, 50, 300, 300, 380);
  bgRad.addColorStop(0, '#191924');
  bgRad.addColorStop(1, '#0b0b0e');
  ctx.fillStyle = bgRad;
  ctx.fillRect(0, 0, 600, 600);

  // 2. Micro Grid & Labyrinth Lines
  ctx.strokeStyle = 'rgba(245, 242, 235, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 40; x < 560; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, 560);
    ctx.stroke();
  }
  for (let y = 40; y < 560; y += 40) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(560, y);
    ctx.stroke();
  }

  // 3. Central Sacred Astrolabe & Geometry
  ctx.save();
  ctx.translate(300, 260);

  // Outer Astrolabe Ring
  ctx.strokeStyle = 'rgba(245, 242, 235, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 160, 0, Math.PI * 2);
  ctx.stroke();

  // Dashed Ring
  ctx.strokeStyle = 'rgba(230, 57, 70, 0.4)';
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 140, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Solar Cinnabar Sun Disk / Seal Core
  const seed = (options.title.length + options.bpm) % 3;
  if (seed === 0) {
    // Bold off-center Cinnabar Disk
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.fill();

    // Inner bone circle
    ctx.fillStyle = '#f5f2eb';
    ctx.beginPath();
    ctx.arc(20, -20, 25, 0, Math.PI * 2);
    ctx.fill();
  } else if (seed === 1) {
    // Interlocking Solar Gold & Cinnabar Rings
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(-25, 0, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.arc(25, 0, 55, 0, Math.PI * 2);
    ctx.fill();

    // Sumi center cutout
    ctx.fillStyle = '#0b0b0e';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sacred Temple Diamond
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(90, 0);
    ctx.lineTo(0, 90);
    ctx.lineTo(-90, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f5f2eb';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Astrolabe Cardinal Ticks
  ctx.strokeStyle = 'rgba(245, 242, 235, 0.5)';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 150, Math.sin(a) * 150);
    ctx.lineTo(Math.cos(a) * 170, Math.sin(a) * 170);
    ctx.stroke();
  }

  // Kanji Watermark
  ctx.fillStyle = 'rgba(245, 242, 235, 0.12)';
  ctx.font = 'bold 72px "Shippori Mincho", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('音律', 0, 0);

  ctx.restore();

  // 4. Modernist Frame & Registration Marks
  ctx.strokeStyle = 'rgba(245, 242, 235, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, 540, 540);

  // Corner crosshairs (+)
  drawCrosshair(ctx, 30, 30);
  drawCrosshair(ctx, 570, 30);
  drawCrosshair(ctx, 30, 570);
  drawCrosshair(ctx, 570, 570);

  // 5. Header Telemetry
  ctx.fillStyle = 'rgba(245, 242, 235, 0.6)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('RHYTHM COASTER // ACOUSTIC ARCHIVE', 45, 55);

  ctx.textAlign = 'right';
  ctx.fillText(`${options.bpm} BPM // ${options.durationFormatted}`, 555, 55);

  // 6. Japanese Hanko Stamp (Bottom Right)
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(510, 485, 45, 45);
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 14px "Shippori Mincho", serif';
  ctx.textAlign = 'center';
  ctx.fillText('極音', 532, 505);
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText('2026', 532, 520);

  // 7. Song Title & Artist Typography (Modernist Poster Grid)
  const displayTitle = options.title.length > 22 ? options.title.slice(0, 20) + '...' : options.title;
  const displayArtist = options.artist.length > 26 ? options.artist.slice(0, 24) + '...' : options.artist;

  ctx.fillStyle = '#f5f2eb';
  ctx.font = 'bold 24px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(displayTitle.toUpperCase(), 45, 485);

  ctx.fillStyle = '#d4a373';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`ARTIST // ${displayArtist.toUpperCase()}`, 45, 510);

  ctx.fillStyle = 'rgba(245, 242, 235, 0.4)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('PROCESSED TRANSMISSION // SACRED KINETIC MATRIX', 45, 530);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 6);
  ctx.stroke();
}
