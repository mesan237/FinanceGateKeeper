import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { hapticTap } from '@/utils/haptics';

export interface Segment {
  key: string;
  label: string;
}

export interface SegmentedControlProps {
  segments: Segment[];
  /** The key of the currently selected segment. */
  value: string;
  onChange: (key: string) => void;
  testID?: string;
}

/**
 * A horizontal pill toggle. The active segment is filled with `PRIMARY_GREEN`;
 * the rest read as muted labels on a neutral track. Each segment is a 44px-tall
 * tab for comfortable touch, exposing its selected state for accessibility.
 */
export function SegmentedControl({ segments, value, onChange, testID }: SegmentedControlProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.track} testID={testID}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            testID={testID ? `${testID}-${segment.key}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) hapticTap();
              onChange(segment.key);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Typography
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={active ? styles.labelActive : styles.label}
            >
              {segment.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: c.BACKGROUND,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: c.PRIMARY_GREEN,
  },
  label: {
    color: c.TEXT_MUTED,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  labelActive: {
    color: c.TEXT_INVERSE,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
