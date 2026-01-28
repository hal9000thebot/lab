import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public');

const COLORS = {
  bg: '#0a0a0a',
  border: 'rgba(255,255,255,0.10)',
  accent: '#14b8a6'
};

function iconSvg({ size = 512, pad = 0.16, radius = 112 } = {}) {
  const p = Math.round(size * pad);
  const inner = size - p * 2;

  // Minimal bicep mark, centered. (Same as GymBroLogo but filled background for app icon.)
  // Stroke scales with size.
  const stroke = Math.max(10, Math.round(size * 0.055));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f1011"/>
      <stop offset="1" stop-color="${COLORS.bg}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <rect x="${Math.round(size*0.06)}" y="${Math.round(size*0.06)}" width="${Math.round(size*0.88)}" height="${Math.round(size*0.88)}" rx="${Math.round(radius*0.8)}" fill="none" stroke="${COLORS.border}" stroke-width="${Math.max(2, Math.round(size*0.01))}"/>

  <g transform="translate(${p}, ${p}) scale(${inner / 64})" stroke="${COLORS.accent}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${stroke / (inner/64)}">
    <path d="M40 17c-3 0-5 2-6 5l-2 7-6-4c-3-2-7-1-9 2-2 3-1 7 2 9l8 5-2 6c-2 5 1 10 6 12 9 4 19 1 25-6 4-5 4-12-1-16l-7-7"/>
    <path d="M44 24h6"/>
  </g>
</svg>`;
}

async function writePng(file, pngBuffer) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, file), pngBuffer);
}

async function main() {
  // Standard icons
  const svg512 = iconSvg({ size: 512, pad: 0.18, radius: 120 });
  const svg192 = iconSvg({ size: 192, pad: 0.18, radius: 44 });

  // Maskable: more padding so safe area keeps the bicep.
  const svgMask = iconSvg({ size: 512, pad: 0.28, radius: 120 });

  // Apple touch icon (iOS will round it).
  const svgApple = iconSvg({ size: 180, pad: 0.18, radius: 42 });

  await writePng('pwa-512.png', await sharp(Buffer.from(svg512)).png().toBuffer());
  await writePng('pwa-192.png', await sharp(Buffer.from(svg192)).png().toBuffer());
  await writePng('pwa-512-maskable.png', await sharp(Buffer.from(svgMask)).png().toBuffer());
  await writePng('apple-touch-icon.png', await sharp(Buffer.from(svgApple)).png().toBuffer());

  // Favicons are optional; keep existing favicon.ico for now.
  console.log('Wrote icons to public/.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
