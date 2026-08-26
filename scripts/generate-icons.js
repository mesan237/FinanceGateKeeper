'use strict';

/**
 * Regenerates every Finance Gatekeeper app icon from the approved reference
 * artwork in assets/fg_real_icon.jfif.
 *
 * The reference is a low-resolution JPEG, so it is traced into vector contours
 * first (scripts/icon/trace.js) and every output is rendered from those — no
 * output is an upscale of the source bitmap. Colours are snapped to the brand
 * tokens in src/constants/colors.ts, which the generated artwork had drifted from.
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { tracePolygons } = require('./icon/trace');
const { renderPolygons, polygonsToSvg } = require('./icon/polygon');
const { solidCanvas, blit, writePng } = require('./icon/raster');

const EMERALD = '#10b981';
const SURFACE = '#F5F7FA';
const INK = '#1A1A1A';

const ROOT = path.resolve(__dirname, '..');
const IMAGES = path.join(ROOT, 'assets', 'images');
const LOGO = path.join(ROOT, 'assets', 'logo');
const IOS_ASSETS = path.join(ROOT, 'assets', 'expo.icon', 'Assets');
const REFERENCE = path.join(ROOT, 'assets', 'fg_real_icon.jfif');

/**
 * Every raster target. `contentFraction` keeps Android's adaptive-icon layers
 * inside the 66% safe zone while letting standalone icons sit larger.
 */
const TARGETS = [
  { file: path.join(IMAGES, 'icon.png'), size: 1024, contentFraction: 0.68, fg: EMERALD, background: SURFACE },
  { file: path.join(IMAGES, 'android-icon-foreground.png'), size: 1024, contentFraction: 0.52, fg: EMERALD },
  { file: path.join(IMAGES, 'android-icon-monochrome.png'), size: 1024, contentFraction: 0.52, fg: '#000000' },
  { file: path.join(IMAGES, 'splash-icon.png'), size: 1024, contentFraction: 0.9, fg: EMERALD },
  { file: path.join(IMAGES, 'favicon.png'), size: 64, contentFraction: 0.92, fg: EMERALD },
];

async function main() {
  fs.mkdirSync(LOGO, { recursive: true });
  fs.mkdirSync(IOS_ASSETS, { recursive: true });

  const { polygons, bounds } = await tracePolygons(REFERENCE);
  const points = polygons.reduce((sum, poly) => sum + poly.length, 0);
  console.log(`trace  ${polygons.length} contours, ${points} points`);

  fs.writeFileSync(path.join(LOGO, 'mark.svg'), polygonsToSvg(polygons, bounds, EMERALD));
  fs.writeFileSync(path.join(LOGO, 'mark-white.svg'), polygonsToSvg(polygons, bounds, '#FFFFFF'));
  fs.writeFileSync(path.join(LOGO, 'mark-ink.svg'), polygonsToSvg(polygons, bounds, INK));
  console.log('svg    assets/logo/mark{,-white,-ink}.svg');

  // The iOS Icon Composer bundle draws this layer over its own emerald fill, so
  // it must be a white knockout scaled to sit on the 1024pt icon canvas.
  fs.writeFileSync(
    path.join(IOS_ASSETS, 'mark.svg'),
    polygonsToSvg(polygons, bounds, '#FFFFFF', 'width="472" height="620"'),
  );
  console.log('svg    assets/expo.icon/Assets/mark.svg');

  for (const target of TARGETS) {
    const canvas = renderPolygons({ polygons, bounds, ...target });
    const bytes = await writePng(canvas, target.file);
    console.log(`png    ${path.relative(ROOT, target.file)} ${target.size}px ${(bytes / 1024).toFixed(1)}kB`);
  }

  const background = solidCanvas(1024, 1024, SURFACE);
  const bgBytes = await writePng(background, path.join(IMAGES, 'android-icon-background.png'));
  console.log(`png    assets/images/android-icon-background.png 1024px ${(bgBytes / 1024).toFixed(1)}kB`);

  await writeContactSheet(polygons, bounds);
}

/**
 * Renders a check sheet: the mark on light, on dark, and as a single-ink
 * silhouette, each at display size and again at a true 48px (magnified 4x,
 * nearest-neighbour, so the real pixel behaviour is visible).
 */
async function writeContactSheet(polygons, bounds) {
  const sheet = solidCanvas(1280, 660, SURFACE);
  const columns = [
    { x: 60, fg: EMERALD, background: SURFACE },
    { x: 480, fg: EMERALD, background: INK },
    { x: 900, fg: INK, background: SURFACE },
  ];

  for (const column of columns) {
    const large = renderPolygons({ polygons, bounds, size: 320, contentFraction: 0.82, ...column });
    blit(sheet, large, column.x, 40);
    const small = renderPolygons({ polygons, bounds, size: 48, contentFraction: 0.82, ...column });
    blit(sheet, small, column.x + 60, 420, 4);
  }

  const bytes = await writePng(sheet, path.join(LOGO, 'preview.png'));
  console.log(`png    assets/logo/preview.png 1280x660 ${(bytes / 1024).toFixed(1)}kB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
