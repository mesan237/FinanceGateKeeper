import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Pill } from '@/components/Pill';

import type { CostType } from './expenses.types';

export interface CostTypeToggleProps {
  /** The category's effective type, inheritance applied. */
  costType: CostType;
  /** Display name, for the accessibility label. */
  name: string;
  onToggle: () => void;
  testID?: string;
}

/**
 * A one-tap Fixed / Variable chip for a category row (VS-41). Variable reads in
 * the success tone: it is the spending a new habit can change.
 */
export function CostTypeToggle({ costType, name, onToggle, testID }: CostTypeToggleProps) {
  const { t } = useTranslation('expenses');
  const label = t(`manager.costType.${costType}`);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('manager.costType.label', { name, type: label.toLowerCase() })}
      onPress={onToggle}
      hitSlop={6}
    >
      <Pill label={label} tone={costType === 'variable' ? 'success' : 'neutral'} />
    </Pressable>
  );
}
