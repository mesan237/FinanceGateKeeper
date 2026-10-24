'use strict';

const { rect, circle, poly, union, minus } = require('./shapes');

/**
 * The Finance Gatekeeper mark: an emerald wallet with a banknote tucked behind
 * it and a keyhole for its clasp, set on navy. Drawn in 100-unit space; the
 * wallet itself spans WALLET_BOUNDS and every output fits that box to its own
 * size, so the icon, the splash and the favicon share one silhouette.
 */

const COLORS = {
  emerald: '#10b981',
  deep: '#047857',
  note: '#a7f3d0',
  navy: '#0f1f2e',
};

/** The rounded app tile, for outputs that draw their own corners. */
const TILE = rect(0, 0, 100, 100, 23);

const KEYHOLE = union(
  circle(72, 48.5, 6.8),
  poly([[69.3, 51], [74.7, 51], [76.5, 63.5], [67.5, 63.5]]),
);
const NOTE = rect(20, 12, 52, 20, 3, -6);
const BODY = rect(12, 26, 76, 54, 10);
/** Rounded on the left, square on the right so it sits flush with the body edge. */
const CLASP = union(rect(54, 38, 34, 30, 9), rect(72, 38, 16, 30));

/** The wallet's own bounding box. */
const WALLET_BOUNDS = { x0: 12, y0: 9, x1: 88, y1: 80 };

/** The wallet in colour, bottom layer first, on a clear background. */
const WALLET = [
  { fill: COLORS.note, shape: NOTE },
  { fill: COLORS.emerald, shape: BODY },
  { fill: COLORS.deep, shape: CLASP },
  { fill: COLORS.navy, shape: KEYHOLE },
];

/**
 * The one-colour glyph (Android themed icon, ink and white marks): the wallet
 * outlined, the note tucked behind it (a 3-unit gap separates them), and the
 * clasp solid with the keyhole cut out.
 */
const MONO = union(
  minus(NOTE, rect(9, 23, 82, 60, 13)),
  minus(BODY, rect(18, 32, 64, 42, 5)),
  minus(rect(50, 38, 38, 30, 9), KEYHOLE),
);

module.exports = { COLORS, TILE, WALLET, WALLET_BOUNDS, MONO };
