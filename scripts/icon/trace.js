'use strict';

const Jimp = require('jimp-compact');

/**
 * Traces the approved Finance Gatekeeper mark out of the reference artwork into
 * clean polygons, so every icon size is rendered from vector data rather than
 * upscaled from a low-resolution JPEG.
 */

/** Where the mark sits inside the reference lockup, plus a safety margin. */
const CROP = { x: 100, y: 238, width: 226, height: 292 };
const THRESHOLD = 0.5;

/**
 * Builds a continuous 0..1 coverage field from the reference. Emerald reads 1,
 * the knocked-out white and the page around the mark read 0, and the JPEG's
 * anti-aliased edge pixels land in between, which is what gives sub-pixel
 * accurate contours.
 */
async function loadField(imagePath) {
  const image = await Jimp.read(imagePath);
  const { width: iw, data } = image.bitmap;
  const { x, y, width, height } = CROP;
  const field = new Float32Array(width * height);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const i = ((y + row) * iw + (x + col)) * 4;
      // Emerald has green ~138 above red; white and the page have none.
      const greenness = (data[i + 1] - data[i]) / 130;
      field[row * width + col] = Math.max(0, Math.min(1, greenness));
    }
  }
  return smoothField({ width, height, data: field });
}

/**
 * One pass of a 3x3 binomial blur. JPEG ringing along the mark's edges would
 * otherwise show up as saddle cells that fragment the traced contours.
 */
function smoothField({ width, height, data }) {
  const out = new Float32Array(width * height);
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : data[y * width + x]);
  const weights = [1, 2, 1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          sum += at(x + dx, y + dy) * weights[dx + 1] * weights[dy + 1];
        }
      }
      out[y * width + x] = sum / 16;
    }
  }
  return { width, height, data: out };
}

/** Bilinear sample of the coverage field, clamped at the edges. */
function sampleField(field, x, y) {
  const { width, height, data } = field;
  const cx = Math.max(0, Math.min(width - 1.001, x));
  const cy = Math.max(0, Math.min(height - 1.001, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const fx = cx - x0;
  const fy = cy - y0;
  const a = data[y0 * width + x0];
  const b = data[y0 * width + x0 + 1];
  const c = data[(y0 + 1) * width + x0];
  const d = data[(y0 + 1) * width + x0 + 1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/** Marching-squares segment table, indexed by the corner mask. */
const CASES = [
  [], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
  [[2, 3]], [[2, 0]], [[0, 1], [2, 3]], [[2, 1]], [[1, 3]], [[1, 0]], [[0, 3]], [],
];

/** Linear interpolation of the threshold crossing along one cell edge. */
function edgePoint(edge, x, y, v) {
  const t = (a, b) => (THRESHOLD - a) / (b - a || 1e-9);
  if (edge === 0) return [x + t(v[0], v[1]), y];
  if (edge === 1) return [x + 1, y + t(v[1], v[2])];
  if (edge === 2) return [x + t(v[3], v[2]), y + 1];
  return [x, y + t(v[0], v[3])];
}

/** Extracts closed contours from the coverage field at the 0.5 threshold. */
function traceContours(field) {
  const { width, height, data } = field;
  const get = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : data[y * width + x]);
  const segments = new Map();
  const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const v = [get(x, y), get(x + 1, y), get(x + 1, y + 1), get(x, y + 1)];
      const mask = (v[0] >= THRESHOLD ? 1 : 0) | (v[1] >= THRESHOLD ? 2 : 0)
        | (v[2] >= THRESHOLD ? 4 : 0) | (v[3] >= THRESHOLD ? 8 : 0);
      for (const [from, to] of CASES[mask]) {
        const a = edgePoint(from, x, y, v);
        const b = edgePoint(to, x, y, v);
        const k = key(a);
        if (!segments.has(k)) segments.set(k, []);
        segments.get(k).push(b);
      }
    }
  }

  // Walk chains by consuming segments, so vertices that carry more than one
  // outgoing segment (saddle cells) do not truncate the contour.
  const loops = [];
  for (const start of [...segments.keys()]) {
    while ((segments.get(start) || []).length > 0) {
      const loop = [];
      let current = start;
      for (;;) {
        const outgoing = segments.get(current);
        if (!outgoing || outgoing.length === 0) break;
        const next = outgoing.shift();
        loop.push(next);
        current = key(next);
        if (current === start) break;
      }
      if (loop.length > 8) loops.push(loop);
    }
  }
  return loops;
}

/** Ramer-Douglas-Peucker simplification of one closed contour. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const perpendicular = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
  };
  const run = (pts) => {
    let index = 0;
    let max = 0;
    for (let i = 1; i < pts.length - 1; i += 1) {
      const dist = perpendicular(pts[i], pts[0], pts[pts.length - 1]);
      if (dist > max) {
        max = dist;
        index = i;
      }
    }
    if (max <= epsilon) return [pts[0], pts[pts.length - 1]];
    return [...run(pts.slice(0, index + 1)).slice(0, -1), ...run(pts.slice(index))];
  };
  const closed = [...points, points[0]];
  const out = run(closed);
  out.pop();
  return out;
}

/** Traces the reference into simplified polygons plus their bounding box. */
async function tracePolygons(imagePath, epsilon = 0.32) {
  const field = await loadField(imagePath);
  const polygons = traceContours(field)
    .map((loop) => simplify(loop, epsilon))
    .filter((poly) => poly.length >= 3);

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const poly of polygons) {
    for (const [px, py] of poly) {
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
  }
  return { polygons, bounds: { x0, y0, x1, y1 }, field };
}

module.exports = { tracePolygons, sampleField, loadField, traceContours, simplify };
