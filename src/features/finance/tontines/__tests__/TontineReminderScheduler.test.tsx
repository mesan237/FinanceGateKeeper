import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockReconcile = jest.fn();
jest.mock('@/features/finance/tontines/tontines.reminders', () => ({
  reconcileTontineReminders: () => mockReconcile(),
}));

import { AttentionProvider, useAttention } from '@/components/AttentionProvider';
import { ATTENTION_TONTINES } from '@/constants/attention';
import { TontineReminderScheduler } from '@/features/finance/tontines/TontineReminderScheduler';
import { buildTontineDueAlert } from '@/notifications/triggers/tontineDue';
import { notifyTontineChange } from '@/features/finance/tontines/tontines.events';

function Reader() {
  const { soon, overdue } = useAttention(ATTENTION_TONTINES);
  return <Text testID="counts">{`${soon}/${overdue}`}</Text>;
}

function renderScheduler() {
  render(
    <AttentionProvider>
      <TontineReminderScheduler>
        <Reader />
      </TontineReminderScheduler>
    </AttentionProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReconcile.mockResolvedValue({ soon: 1, overdue: 2 });
});

describe('TontineReminderScheduler (VS-52)', () => {
  it('plans the reminders on open and publishes what needs attention', async () => {
    renderScheduler();

    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('1/2'));
  });

  it('re-plans after a tontine or a payment changes', async () => {
    renderScheduler();
    await waitFor(() => expect(mockReconcile).toHaveBeenCalledTimes(1));
    mockReconcile.mockResolvedValue({ soon: 0, overdue: 0 });

    await act(async () => {
      notifyTontineChange();
    });

    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('0/0'));
  });
});

describe('buildTontineDueAlert', () => {
  const at = new Date(2026, 9, 19, 9, 0);

  it('names the tontine and the amount due', () => {
    const alert = buildTontineDueAlert({
      tontineName: 'Njangi',
      count: 1,
      amount: 10_000,
      dueDate: '2026-10-26',
      kind: 'today',
      scheduledAt: at,
    });

    expect(alert).toEqual(
      expect.objectContaining({ type: 'tontineDue', title: 'Tontine contribution', scheduledAt: at }),
    );
    expect(alert.body).toBe('Njangi: 10 000 FCFA to pay today.');
  });

  it('says how many contributions are overdue', () => {
    const alert = buildTontineDueAlert({
      tontineName: 'Njangi',
      count: 2,
      amount: 20_000,
      dueDate: '2026-10-05',
      kind: 'overdue',
      scheduledAt: at,
    });

    expect(alert.body).toBe('Njangi: 2 contributions overdue (20 000 FCFA).');
  });
});
