'use strict';

const Jimp = require('jimp-compact');

const SUPERSAMPLE = 4;

/** Parses '#RRGGBB' into an [r, g, b] triple. */
function parseHex(hex) {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

/** Allocates a transparent RGBA canvas. */
function createCanvas(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4, 0) };
}

/**
 * Renders a local-space hit test into an RGBA canvas, scaling the mark so it
 * occupies `contentFraction` of the smaller canvas dimension and centring it.
 *
 * @param {object} options
 * @param {(x: number, y: number) => boolean} options.test Local-space hit test.
 * @param {{x0:number,y0:number,x1:number,y1:number}} options.bounds Local bounds of the mark.
 * @param {number} options.size Output edge length in pixels.
 * @param {number} options.contentFraction How much of the canvas the mark fills.
 * @param {string} options.fg Foreground hex colour.
 * @param {string|null} [options.background] Hex fill, or null for transparency.
 */
function renderMark({ test, bounds, size, contentFraction, fg, background = null }) {
  const canvas = createCanvas(size, size);
  const [fr, fg_, fb] = parseHex(fg);
  const bgColor = background ? parseHex(background) : null;

  const boxW = bounds.x1 - bounds.x0;
  const boxH = bounds.y1 - bounds.y0;
  const scale = (size * contentFraction) / Math.max(boxW, boxH);
  const offsetX = size / 2 - (bounds.x0 + boxW / 2) * scale;
  const offsetY = size / 2 - (bounds.y0 + boxH / 2) * scale;

  const step = 1 / SUPERSAMPLE;
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        const ly = (py + (sy + 0.5) * step - offsetY) / scale;
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const lx = (px + (sx + 0.5) * step - offsetX) / scale;
          if (test(lx, ly)) hits += 1;
        }
      }
      const coverage = hits / samples;
      const i = (py * size + px) * 4;
      if (bgColor) {
        canvas.data[i] = Math.round(bgColor[0] + (fr - bgColor[0]) * coverage);
        canvas.data[i + 1] = Math.round(bgColor[1] + (fg_ - bgColor[1]) * coverage);
        canvas.data[i + 2] = Math.round(bgColor[2] + (fb - bgColor[2]) * coverage);
        canvas.data[i + 3] = 255;
      } else {
        canvas.data[i] = fr;
        canvas.data[i + 1] = fg_;
        canvas.data[i + 2] = fb;
        canvas.data[i + 3] = Math.round(coverage * 255);
      }
    }
  }
  return canvas;
}

/** Fills a canvas with a solid opaque colour. */
function solidCanvas(width, height, hex) {
  const canvas = createCanvas(width, height);
  const [r, g, b] = parseHex(hex);
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = r;
    canvas.data[i + 1] = g;
    canvas.data[i + 2] = b;
    canvas.data[i + 3] = 255;
  }
  return canvas;
}

/** Source-over composite of `src` onto `dst` at (dx, dy), optionally magnified. */
function blit(dst, src, dx, dy, magnify = 1) {
  for (let y = 0; y < src.height * magnify; y += 1) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    const sy = Math.floor(y / magnify);
    for (let x = 0; x < src.width * magnify; x += 1) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (sy * src.width + Math.floor(x / magnify)) * 4;
      const alpha = src.data[s + 3] / 255;
      if (alpha === 0) continue;
      const t = (ty * dst.width + tx) * 4;
      for (let c = 0; c < 3; c += 1) {
        dst.data[t + c] = Math.round(dst.data[t + c] * (1 - alpha) + src.data[s + c] * alpha);
      }
      dst.data[t + 3] = Math.max(dst.data[t + 3], src.data[s + 3]);
    }
  }
}

/** Writes an RGBA canvas out as a PNG file. */
async function writePng(canvas, filePath) {
  const image = new Jimp(canvas.width, canvas.height, 0x00000000);
  canvas.data.copy(image.bitmap.data);
  const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
  require('fs').writeFileSync(filePath, buffer);
  return buffer.length;
}

module.exports = { renderMark, solidCanvas, createCanvas, blit, writePng, parseHex };
