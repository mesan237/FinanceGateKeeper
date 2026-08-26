'use strict';

const { parseHex, createCanvas } = require('./raster');

/**
 * Renders and serialises traced polygon contours. Even-odd winding means nested
 * contours alternate between hole and fill, which is what turns the clasp
 * inside the wallet back into emerald.
 */

const SUPERSAMPLE = 4;

/** Maps source-space polygons into output pixel space and returns their edges. */
function buildEdges(polygons, transform) {
  const edges = [];
  for (const poly of polygons) {
    for (let i = 0; i < poly.length; i += 1) {
      const a = transform(poly[i]);
      const b = transform(poly[(i + 1) % poly.length]);
      if (a[1] === b[1]) continue;
      edges.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
    }
  }
  return edges;
}

/** Accumulates horizontal coverage for one span, with partial end pixels. */
function addSpan(coverage, size, row, xa, xb, weight) {
  const start = Math.max(0, xa);
  const end = Math.min(size, xb);
  if (end <= start) return;
  const base = row * size;
  const first = Math.floor(start);
  const last = Math.min(size - 1, Math.floor(end - 1e-9));
  if (first === last) {
    coverage[base + first] += (end - start) * weight;
    return;
  }
  coverage[base + first] += (first + 1 - start) * weight;
  for (let i = first + 1; i < last; i += 1) coverage[base + i] += weight;
  coverage[base + last] += (end - last) * weight;
}

/**
 * Scanline-renders traced polygons into an RGBA canvas, fitting the mark to
 * `contentFraction` of the canvas and centring it.
 *
 * @param {object} options
 * @param {number[][][]} options.polygons Contours in source coordinates.
 * @param {{x0:number,y0:number,x1:number,y1:number}} options.bounds Source bounds.
 * @param {number} options.size Output edge length in pixels.
 * @param {number} options.contentFraction How much of the canvas the mark fills.
 * @param {string} options.fg Foreground hex colour.
 * @param {string|null} [options.background] Hex fill, or null for transparency.
 */
function renderPolygons({ polygons, bounds, size, contentFraction, fg, background = null }) {
  const boxW = bounds.x1 - bounds.x0;
  const boxH = bounds.y1 - bounds.y0;
  const scale = (size * contentFraction) / Math.max(boxW, boxH);
  const offsetX = size / 2 - (bounds.x0 + boxW / 2) * scale;
  const offsetY = size / 2 - (bounds.y0 + boxH / 2) * scale;
  const edges = buildEdges(polygons, ([x, y]) => [x * scale + offsetX, y * scale + offsetY]);

  const coverage = new Float32Array(size * size);
  const weight = 1 / SUPERSAMPLE;
  const crossings = [];

  for (let sub = 0; sub < size * SUPERSAMPLE; sub += 1) {
    const y = (sub + 0.5) * weight;
    const row = Math.floor(y);
    if (row < 0 || row >= size) continue;
    crossings.length = 0;
    for (const e of edges) {
      const top = Math.min(e.ay, e.by);
      const bottom = Math.max(e.ay, e.by);
      if (y < top || y >= bottom) continue;
      crossings.push(e.ax + ((y - e.ay) * (e.bx - e.ax)) / (e.by - e.ay));
    }
    if (crossings.length < 2) continue;
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      addSpan(coverage, size, row, crossings[i], crossings[i + 1], weight);
    }
  }

  const canvas = createCanvas(size, size);
  const [fr, fgg, fb] = parseHex(fg);
  const bg = background ? parseHex(background) : null;
  for (let i = 0; i < coverage.length; i += 1) {
    const a = Math.max(0, Math.min(1, coverage[i]));
    const p = i * 4;
    if (bg) {
      canvas.data[p] = Math.round(bg[0] + (fr - bg[0]) * a);
      canvas.data[p + 1] = Math.round(bg[1] + (fgg - bg[1]) * a);
      canvas.data[p + 2] = Math.round(bg[2] + (fb - bg[2]) * a);
      canvas.data[p + 3] = 255;
    } else {
      canvas.data[p] = fr;
      canvas.data[p + 1] = fgg;
      canvas.data[p + 2] = fb;
      canvas.data[p + 3] = Math.round(a * 255);
    }
  }
  return canvas;
}

/** Serialises traced polygons as a single even-odd SVG path, origin-normalised. */
function polygonsToPath(polygons, bounds) {
  const fmt = (n) => Number(n.toFixed(2));
  return polygons
    .map((poly) => {
      const points = poly.map(([x, y]) => `${fmt(x - bounds.x0)} ${fmt(y - bounds.y0)}`);
      return `M ${points.join(' L ')} Z`;
    })
    .join(' ');
}

/**
 * A single-colour mark whose negative space is transparent.
 *
 * @param {string} fill Hex colour for the emerald areas.
 * @param {string} [dimensions] Explicit width/height attributes.
 */
function polygonsToSvg(polygons, bounds, fill, dimensions) {
  const width = Number((bounds.x1 - bounds.x0).toFixed(2));
  const height = Number((bounds.y1 - bounds.y0).toFixed(2));
  const size = dimensions || `width="${width}" height="${height}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ${size}>
  <title>Finance Gatekeeper</title>
  <path fill="${fill}" fill-rule="evenodd" d="${polygonsToPath(polygons, bounds)}"/>
</svg>
`;
}

module.exports = { renderPolygons, polygonsToSvg, polygonsToPath };
