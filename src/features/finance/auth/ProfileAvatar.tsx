import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AVATAR_PALETTE } from '@/constants/categoryIcons';
import { FONT_FAMILY } from '@/constants/fonts';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** Derives up-to-two-letter initials from a display name (e.g. "Abdiel K" → "AK"). */
export function initialsFor(name: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase());
  return letters.join('');
}

/** Picks a stable palette color from the name when none was chosen. */
function colorFor(name: string | null, chosen: string | null): string {
  if (chosen) return chosen;
  const key = name ?? '';
  return AVATAR_PALETTE[key.length % AVATAR_PALETTE.length];
}

export interface ProfileAvatarProps {
  displayName: string | null;
  avatarColor: string | null;
  avatarEmoji: string | null;
  /** Diameter in px (default 96). */
  size?: number;
}

/**
 * The user's avatar: a colored circle showing a chosen emoji, or initials
 * derived from the display name when no emoji is set. Rendered entirely
 * on-device — there is no uploaded image.
 */
export function ProfileAvatar({
  displayName,
  avatarColor,
  avatarEmoji,
  size = 96,
}: ProfileAvatarProps) {
  const styles = useThemedStyles(makeStyles);
  const background = colorFor(displayName, avatarColor);
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: background,
  };

  return (
    <View testID="profile-avatar" style={[styles.circle, circle]}>
      {avatarEmoji ? (
        <Text style={{ fontSize: size * 0.5 }}>{avatarEmoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsFor(displayName)}</Text>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: c.TEXT_INVERSE,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
  },
});
