import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { AVATAR_PALETTE } from '@/constants/categoryIcons';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { CloudAccountCard } from './CloudAccountCard';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfile } from './auth.hooks';

const EMOJI_CHOICES = ['😎', '🚀', '💰', '🦁', '🌟', '🔥', '🐘', '🌍'];

/**
 * Edit the local profile: display name, avatar color, and an optional emoji
 * (clearing the emoji falls back to name initials). Also hosts the Change PIN
 * entry and the shared cloud-account card. The avatar preview at the top
 * reflects the in-progress edits before they are saved.
 */
export function ProfileScreen() {
  const { profile, save } = useProfile();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the editable fields once the profile loads.
  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName ?? '');
    setColor(profile.avatarColor);
    setEmoji(profile.avatarEmoji);
  }, [profile]);

  const onSave = async () => {
    await save({
      displayName: name.trim() === '' ? null : name.trim(),
      avatarColor: color,
      avatarEmoji: emoji,
    });
    setSaved(true);
  };

  const displayName = name.trim() === '' ? null : name.trim();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" />

      <View style={styles.avatarWrap}>
        <ProfileAvatar displayName={displayName} avatarColor={color} avatarEmoji={emoji} />
      </View>

      <SectionCard icon="profile" title="Display name">
        <TextInput
          testID="profile-name-input"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
          placeholder="Your name"
          accessibilityLabel="Display name"
        />
      </SectionCard>

      <SectionCard icon="appearance" title="Avatar color">
        <View style={styles.swatchRow}>
          {AVATAR_PALETTE.map((swatch) => (
            <Pressable
              key={swatch}
              testID={`profile-color-${swatch}`}
              accessibilityRole="button"
              onPress={() => {
                setColor(swatch);
                setSaved(false);
              }}
              style={[
                styles.swatch,
                { backgroundColor: swatch },
                color === swatch && styles.swatchSelected,
              ]}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard icon="reports" title="Avatar emoji" subtitle="Or leave it off to show your initials.">
        <View style={styles.emojiRow}>
          <Pressable
            testID="profile-emoji-none"
            accessibilityRole="button"
            onPress={() => {
              setEmoji(null);
              setSaved(false);
            }}
            style={[styles.emojiChip, emoji === null && styles.emojiChipSelected]}
          >
            <Typography variant="muted">Aa</Typography>
          </Pressable>
          {EMOJI_CHOICES.map((choice) => (
            <Pressable
              key={choice}
              testID={`profile-emoji-${choice}`}
              accessibilityRole="button"
              onPress={() => {
                setEmoji(choice);
                setSaved(false);
              }}
              style={[styles.emojiChip, emoji === choice && styles.emojiChipSelected]}
            >
              <Typography style={styles.emojiGlyph}>{choice}</Typography>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <Button testID="profile-save" label={saved ? 'Saved' : 'Save profile'} onPress={onSave} />

      <SectionCard icon="lock" title="Security" subtitle="Lock the app with a 4-digit PIN.">
        <Button
          testID="profile-change-pin"
          label="Change PIN"
          variant="secondary"
          onPress={() => router.push('/profile/change-pin')}
        />
      </SectionCard>

      <CloudAccountCard testIDPrefix="profile" />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    container: {
      padding: 16,
      gap: 14,
      paddingBottom: 40,
    },
    avatarWrap: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    swatchSelected: {
      borderColor: c.TEXT_PRIMARY,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    emojiChip: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.SURFACE_MUTED,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    emojiChipSelected: {
      borderColor: c.PRIMARY_GREEN,
    },
    emojiGlyph: {
      fontSize: 22,
    },
  });
