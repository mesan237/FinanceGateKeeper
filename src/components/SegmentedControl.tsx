import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { BACKGROUND, PRIMARY_GREEN, TEXT_MUTED } from '@/constants/colors';

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
            onPress={() => onChange(segment.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Typography style={active ? styles.labelActive : styles.label}>
              {segment.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: BACKGROUND,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: PRIMARY_GREEN,
  },
  label: {
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
