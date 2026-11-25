// ============================================
// TanglePuzzle — Puzzle Generator Utilities
// ============================================

/**
 * Seeded PRNG (Linear Congruential Generator).
 * Both clients produce identical output for the same seed.
 */
function seededRandom(seed) {
  let s = seed;
  return function next() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Generate a deterministic built-in image on a canvas and return a dataURL.
 * @param {number} index - Image pattern index (0-3)
 * @param {number} width - Canvas width (default 800)
 * @param {number} height - Canvas height (default 600)
 * @returns {string} Base64 PNG dataURL
 */
export function generateBuiltinImage(index, width = 800, height = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const seed = (index + 1) * 12345;
  const rand = seededRandom(seed);

  switch (index) {
    case 0:
      drawStainedGlass(ctx, width, height, rand);
      break;
    case 1:
      drawCosmicNebula(ctx, width, height, rand);
      break;
    case 2:
      drawSunsetLandscape(ctx, width, height, rand);
      break;
    case 3:
      drawAbstractMosaic(ctx, width, height, rand);
      break;
    default:
      drawStainedGlass(ctx, width, height, rand);
  }

  return canvas.toDataURL('image/png');
}

// --- Pattern 0: Stained Glass ---
function drawStainedGlass(ctx, w, h, rand) {
  const cols = 20;
  const rows = 15;
  const cellW = w / cols;
  const cellH = h / rows;
  const gap = 3;

  // Dark background behind gaps
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hue = Math.floor(rand() * 360);
      ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
      ctx.fillRect(
        c * cellW + gap,
        r * cellH + gap,
        cellW - gap * 2,
        cellH - gap * 2
      );
    }
  }
}

// --- Pattern 1: Cosmic Nebula ---
function drawCosmicNebula(ctx, w, h, rand) {
  // Dark space background
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, w, h);

  // 5-6 overlapping radial gradients
  const nebulaColors = [
    ['rgba(100, 0, 150, 0.4)', 'rgba(100, 0, 150, 0)'],
    ['rgba(0, 50, 180, 0.35)', 'rgba(0, 50, 180, 0)'],
    ['rgba(180, 0, 100, 0.3)', 'rgba(180, 0, 100, 0)'],
    ['rgba(60, 0, 200, 0.35)', 'rgba(60, 0, 200, 0)'],
    ['rgba(150, 50, 200, 0.3)', 'rgba(150, 50, 200, 0)'],
    ['rgba(0, 100, 180, 0.25)', 'rgba(0, 100, 180, 0)'],
  ];

  for (let i = 0; i < nebulaColors.length; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const radius = 150 + rand() * 250;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, nebulaColors[i][0]);
    grad.addColorStop(1, nebulaColors[i][1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // 200+ tiny star dots
  for (let i = 0; i < 220; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    const sr = 0.5 + rand() * 1.5;
    const alpha = 0.5 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
}

// --- Pattern 2: Sunset Landscape ---
function drawSunsetLandscape(ctx, w, h, rand) {
  // Sky gradient: orange bottom to deep purple top
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#2d1b69');
  skyGrad.addColorStop(0.4, '#8b2f6a');
  skyGrad.addColorStop(0.7, '#e8653a');
  skyGrad.addColorStop(1, '#f5a623');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Golden sun
  const sunX = w * 0.5 + (rand() - 0.5) * w * 0.2;
  const sunY = h * 0.55;
  const sunR = 50 + rand() * 20;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunGrad.addColorStop(0, '#ffe680');
  sunGrad.addColorStop(0.6, '#f5a623');
  sunGrad.addColorStop(1, 'rgba(245, 166, 35, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // 3 layers of mountain silhouettes
  const mountainColors = ['#3d2066', '#2a1545', '#1a0d2e'];
  const baselines = [h * 0.6, h * 0.72, h * 0.85];

  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const baseline = baselines[layer];
    const peaks = 6 + layer * 2;
    const segW = w / peaks;
    for (let p = 0; p <= peaks; p++) {
      const px = p * segW;
      const peakH = baseline - (40 + rand() * (100 - layer * 25));
      if (p === 0) {
        ctx.lineTo(0, peakH);
      } else {
        const cpx = px - segW / 2;
        ctx.quadraticCurveTo(cpx, peakH, px, baseline - rand() * 20);
      }
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = mountainColors[layer];
    ctx.fill();
  }
}

// --- Pattern 3: Abstract Mosaic ---
function drawAbstractMosaic(ctx, w, h, rand) {
  // Neutral background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  // 50+ overlapping shapes
  for (let i = 0; i < 55; i++) {
    const hue = Math.floor(rand() * 360);
    const alpha = 0.3 + rand() * 0.5;
    ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${alpha})`;

    if (rand() > 0.5) {
      // Circle
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 20 + rand() * 100;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rectangle
      const rx = rand() * w;
      const ry = rand() * h;
      const rw = 30 + rand() * 150;
      const rh = 30 + rand() * 150;
      ctx.fillRect(rx, ry, rw, rh);
    }
  }
}

/**
 * Built-in image metadata.
 */
export const BUILTIN_IMAGES = [
  { index: 0, name: 'Stained Glass' },
  { index: 1, name: 'Cosmic Nebula' },
  { index: 2, name: 'Sunset Landscape' },
  { index: 3, name: 'Abstract Mosaic' },
];

/**
 * Get grid dimensions (rows, cols) for a given piece count.
 * @param {number} pieceCount
 * @returns {{ rows: number, cols: number }}
 */
export function getGridDimensions(pieceCount) {
  switch (pieceCount) {
    case 24:
      return { cols: 6, rows: 4 };
    case 48:
      return { cols: 8, rows: 6 };
    case 80:
      return { cols: 10, rows: 8 };
    default:
      return { cols: 8, rows: 6 };
  }
}
