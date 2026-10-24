'use strict';

/**
 * Regenerates every Finance Gatekeeper app icon from the wallet-and-keyhole
 * mark defined in scripts/icon/wallet.js. The mark is exact geometry, so every
 * PNG and SVG is drawn from vectors at its own size. Colours match the brand
 * tokens in src/constants/colors.ts.
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { rect, contains, layersToSvg } = require('./icon/shapes');
const { COLORS, WALLET, WALLET_BOUNDS, MONO } = require('./icon/wallet');
const { renderLayers, renderMark, solidCanvas, blit, writePng } = require('./icon/raster');

const SURFACE = '#F5F7FA';
const INK = '#1A1A1A';

const ROOT = path.resolve(__dirname, '..');
const IMAGES = path.join(ROOT, 'assets', 'images');
const LOGO = path.join(ROOT, 'assets', 'logo');

/** How much of the icon's edge the wallet spans. */
const ICON_FILL = 0.66;
/** Keeps the wallet inside Android's 66dp safe circle on the 108dp adaptive layer. */
const ADAPTIVE_FILL = 0.47;

const NAVY = { fill: COLORS.navy, shape: rect(-200, -200, 500, 500) };
const WALLET_SIZE = Math.max(WALLET_BOUNDS.x1 - WALLET_BOUNDS.x0, WALLET_BOUNDS.y1 - WALLET_BOUNDS.y0);
const CENTRE = [(WALLET_BOUNDS.x0 + WALLET_BOUNDS.x1) / 2, (WALLET_BOUNDS.y0 + WALLET_BOUNDS.y1) / 2];

/** The square box, centred on the wallet, in which the wallet spans `fill` of the edge. */
function frameFor(fill) {
  const side = WALLET_SIZE / fill;
  const [cx, cy] = CENTRE;
  return { x0: cx - side / 2, y0: cy - side / 2, x1: cx + side / 2, y1: cy + side / 2, side };
}

/** The rounded app tile filling `frame`. */
const tileShape = (frame) => rect(frame.x0, frame.y0, frame.side, frame.side, frame.side * 0.23);

/** The navy tile with the wallet, `fraction` of a transparent `size` canvas. */
function tile(size, fraction) {
  const frame = frameFor(ICON_FILL);
  return renderLayers({ layers: [NAVY, ...WALLET], contains, size, frame, fraction, clip: tileShape(frame) });
}

/** The one-colour glyph in `fg`, spanning `fill` of the canvas edge. */
const glyph = (size, fill, fg, background = null) =>
  renderMark({ test: (x, y) => contains(MONO, x, y), bounds: frameFor(fill), size, contentFraction: 1, fg, background });

/**
 * Every raster target. The store icon is full bleed because the OS rounds it.
 * Android draws the foreground over a solid navy background and masks both to
 * the launcher's shape, so the wallet only has to stay inside the safe circle.
 */
const TARGETS = [
  {
    file: 'icon.png',
    canvas: () =>
      renderLayers({ layers: [NAVY, ...WALLET], contains, size: 1024, frame: frameFor(ICON_FILL), fraction: 1 }),
  },
  {
    file: 'android-icon-foreground.png',
    canvas: () => renderLayers({ layers: WALLET, contains, size: 1024, frame: frameFor(ADAPTIVE_FILL), fraction: 1 }),
  },
  { file: 'android-icon-background.png', canvas: () => solidCanvas(1024, 1024, COLORS.navy) },
  { file: 'android-icon-monochrome.png', canvas: () => glyph(1024, ADAPTIVE_FILL, '#000000') },
  { file: 'splash-icon.png', canvas: () => tile(1024, 0.9) },
  {
    file: 'favicon.png',
    canvas: () => renderLayers({ layers: WALLET, contains, size: 64, frame: WALLET_BOUNDS, fraction: 0.96 }),
  },
];

async function main() {
  fs.mkdirSync(LOGO, { recursive: true });

  const frame = frameFor(ICON_FILL);
  fs.writeFileSync(
    path.join(LOGO, 'mark.svg'),
    layersToSvg({
      layers: [NAVY, ...WALLET],
      viewBox: [frame.x0, frame.y0, frame.side, frame.side].map((n) => Number(n.toFixed(2))),
      clip: tileShape(frame),
      attributes: 'width="512" height="512"',
    }),
  );
  const { x0, y0, x1, y1 } = WALLET_BOUNDS;
  for (const [name, fill] of [['mark-white.svg', '#FFFFFF'], ['mark-ink.svg', INK]]) {
    fs.writeFileSync(path.join(LOGO, name), layersToSvg({ layers: [{ fill, shape: MONO }], viewBox: [x0, y0, x1 - x0, y1 - y0] }));
  }
  console.log('svg    assets/logo/mark{,-white,-ink}.svg');

  for (const target of TARGETS) {
    const canvas = target.canvas();
    const bytes = await writePng(canvas, path.join(IMAGES, target.file));
    console.log(`png    assets/images/${target.file} ${canvas.width}px ${(bytes / 1024).toFixed(1)}kB`);
  }

  await writeContactSheet();
}

/**
 * Renders a check sheet: the tile on light and on dark, and the one-colour
 * glyph, each at display size and again at a true 48px (magnified 4x,
 * nearest-neighbour, so the real pixel behaviour is visible).
 */
async function writeContactSheet() {
  const sheet = solidCanvas(1280, 660, SURFACE);
  blit(sheet, solidCanvas(320, 320, INK), 480, 40);
  blit(sheet, solidCanvas(192, 192, INK), 540, 420);
  const columns = [
    { x: 60, draw: (size) => tile(size, 0.82) },
    { x: 480, draw: (size) => tile(size, 0.82) },
    { x: 900, draw: (size) => glyph(size, 0.82, INK, SURFACE) },
  ];

  for (const column of columns) {
    blit(sheet, column.draw(320), column.x, 40);
    blit(sheet, column.draw(48), column.x + 60, 420, 4);
  }

  const bytes = await writePng(sheet, path.join(LOGO, 'preview.png'));
  console.log(`png    assets/logo/preview.png 1280x660 ${(bytes / 1024).toFixed(1)}kB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
