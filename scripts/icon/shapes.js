'use strict';

/**
 * A tiny vector vocabulary for the app mark: rounded (optionally rotated)
 * rectangles, circles and polygons, combined with union and minus. Each shape
 * can be hit-tested for rasterising and serialised to SVG, so the PNGs and the
 * SVGs are drawn from the same geometry.
 */

/** A rectangle with corner radius `r`, rotated by `rotate` degrees about its centre. */
const rect = (x, y, w, h, r = 0, rotate = 0) => ({ kind: 'rect', x, y, w, h, r, rotate });
/** A circle. */
const circle = (cx, cy, r) => ({ kind: 'circle', cx, cy, r });
/** A closed polygon from [x, y] points. */
const poly = (points) => ({ kind: 'poly', points });
/** Every point inside any of `parts`. */
const union = (...parts) => ({ kind: 'union', parts });
/** Points inside `base` but outside `hole`. */
const minus = (base, hole) => ({ kind: 'minus', base, hole });

/** Rotates [x, y] by `deg` degrees about (cx, cy). */
function rotatePoint([x, y], cx, cy, deg) {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Whether the point (px, py) lies inside `shape`. */
function contains(shape, px, py) {
  switch (shape.kind) {
    case 'rect': {
      const { x, y, w, h, r, rotate } = shape;
      const [lx, ly] = rotate ? rotatePoint([px, py], x + w / 2, y + h / 2, -rotate) : [px, py];
      if (lx < x || lx > x + w || ly < y || ly > y + h) return false;
      const dx = Math.max(x + r - lx, 0, lx - (x + w - r));
      const dy = Math.max(y + r - ly, 0, ly - (y + h - r));
      return dx * dx + dy * dy <= r * r;
    }
    case 'circle':
      return (px - shape.cx) ** 2 + (py - shape.cy) ** 2 <= shape.r ** 2;
    case 'poly': {
      let inside = false;
      const pts = shape.points;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    case 'union':
      return shape.parts.some((part) => contains(part, px, py));
    case 'minus':
      return contains(shape.base, px, py) && !contains(shape.hole, px, py);
    default:
      throw new Error(`Unknown shape kind: ${shape.kind}`);
  }
}

const fmt = (n) => Number(n.toFixed(2));

/** SVG path data for a primitive shape. */
function primitivePath(shape) {
  if (shape.kind === 'circle') {
    const { cx, cy, r } = shape;
    return `M ${fmt(cx - r)} ${fmt(cy)} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  }
  if (shape.kind === 'poly') {
    return `M ${shape.points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L ')} Z`;
  }
  const { x, y, w, h, r, rotate } = shape;
  // Corner arcs stay circular under rotation, so rotating the endpoints is enough.
  const pt = (p) => (rotate ? rotatePoint(p, x + w / 2, y + h / 2, rotate) : p);
  const at = (p) => pt(p).map(fmt).join(' ');
  const arc = (p) => (r ? ` A ${r} ${r} 0 0 1 ${at(p)}` : '');
  return [
    `M ${at([x + r, y])}`,
    ` L ${at([x + w - r, y])}${arc([x + w, y + r])}`,
    ` L ${at([x + w, y + h - r])}${arc([x + w - r, y + h])}`,
    ` L ${at([x + r, y + h])}${arc([x, y + h - r])}`,
    ` L ${at([x, y + r])}${arc([x + r, y])} Z`,
  ].join('');
}

/**
 * Serialises `shape` as SVG markup filled with `fill`. Minus becomes a mask;
 * masks are collected into `defs` under ids drawn from `ids`.
 */
function toSvg(shape, fill, defs, ids) {
  if (shape.kind === 'union') return shape.parts.map((part) => toSvg(part, fill, defs, ids)).join('');
  if (shape.kind === 'minus') {
    const id = `cut${ids.next += 1}`;
    defs.push(
      `<mask id="${id}"><rect x="-1000" y="-1000" width="3000" height="3000" fill="#fff"/>` +
        `${toSvg(shape.hole, '#000', defs, ids)}</mask>`,
    );
    return `<g mask="url(#${id})">${toSvg(shape.base, fill, defs, ids)}</g>`;
  }
  return `<path fill="${fill}" d="${primitivePath(shape)}"/>`;
}

/**
 * A standalone SVG document drawing `layers` ([{ fill, shape }], bottom first)
 * inside `viewBox`, optionally clipped to `clip`.
 */
function layersToSvg({ layers, viewBox, clip = null, attributes = '' }) {
  const defs = [];
  const ids = { next: 0 };
  const body = layers.map(({ fill, shape }) => toSvg(shape, fill, defs, ids)).join('\n    ');
  if (clip) defs.push(`<clipPath id="tile"><path d="${primitivePath(clip)}"/></clipPath>`);
  const open = clip ? '<g clip-path="url(#tile)">' : '<g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(' ')}" ${attributes}>
  <title>Finance Gatekeeper</title>
  <defs>${defs.join('')}</defs>
  ${open}
    ${body}
  </g>
</svg>
`;
}

module.exports = { rect, circle, poly, union, minus, contains, layersToSvg };
