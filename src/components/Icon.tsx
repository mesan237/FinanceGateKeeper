import React from 'react';

import { TEXT_PRIMARY } from '@/constants/colors';
import { ICON_SIZE, ICON_STROKE, ICONS, type IconName } from '@/constants/icons';

export interface IconProps {
  /** Semantic icon name from the chrome registry in `@/constants/icons`. */
  name: IconName;
  /** Glyph size in px (default `ICON_SIZE.md` = 20). */
  size?: number;
  /** Stroke color (default `TEXT_PRIMARY`). */
  color?: string;
  /** Stroke width (default `ICON_STROKE` = 2). */
  strokeWidth?: number;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Renders a chrome icon by semantic name, applying the app's standard size,
 * stroke, and color defaults. The only place app code should obtain a Lucide
 * glyph — keeping sizing/coloring consistent and the icon set swappable.
 */
export function Icon({
  name,
  size = ICON_SIZE.md,
  color = TEXT_PRIMARY,
  strokeWidth = ICON_STROKE,
  testID,
  accessibilityLabel,
}: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
