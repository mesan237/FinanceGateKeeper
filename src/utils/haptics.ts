import * as Haptics from 'expo-haptics';

/** Runs a haptics call and swallows any failure — feedback is best-effort and
 * must never break a flow (web, simulators, and some devices don't support it). */
async function fire(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch {
    // Unsupported platform — ignore.
  }
}

/** Success buzz for completed writes (expense saved, transfer logged). */
export function hapticSuccess(): void {
  void fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning buzz for cautionary interruptions (the over-budget alert). */
export function hapticWarning(): void {
  void fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Light tap for small UI state changes (FAB press, segment switch). */
export function hapticTap(): void {
  void fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
