import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

const mockShow = jest.fn();
jest.mock('@/components/Toast', () => {
  const actual = jest.requireActual('@/components/Toast');
  return { ...actual, useToast: () => ({ show: mockShow }) };
});

const mockCloud = {
  userEmail: null as string | null,
  signedIn: false,
  status: 'idle' as const,
  lastSyncedAt: null as string | null,
  error: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  syncNow: jest.fn(),
};
jest.mock('@/hooks/useCloudSync', () => ({ useCloudSync: () => mockCloud }));

const mockSnapshots = {
  snapshots: [] as unknown[],
  isLoading: false,
  isBusy: false,
  refresh: jest.fn(),
  create: jest.fn(),
  restore: jest.fn(),
  remove: jest.fn(),
};
const mockCloudRestore = jest.fn();
jest.mock('../backup.hooks', () => ({
  useSnapshots: () => mockSnapshots,
  useCloudRestore: () => ({ restore: mockCloudRestore, isRestoring: false }),
}));

import { BackupScreen } from '@/features/finance/backup/BackupScreen';
import i18n from '@/i18n';

const DAILY = {
  id: 'snapshot-2026-10-02T09-00-00-000Z-daily.json',
  createdAt: '2026-10-02T09:00:00.000Z',
  reason: 'daily' as const,
  rowCount: 40,
  sizeBytes: 4096,
};
const MANUAL = {
  id: 'snapshot-2026-10-01T09-00-00-000Z-manual.json',
  createdAt: '2026-10-01T09:00:00.000Z',
  reason: 'manual' as const,
  rowCount: 1,
  sizeBytes: 100,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSnapshots.snapshots = [DAILY, MANUAL];
  mockSnapshots.isBusy = false;
  mockCloud.signedIn = false;
  mockCloud.userEmail = null;
  mockCloud.lastSyncedAt = null;
});

function signIn() {
  mockCloud.signedIn = true;
  mockCloud.userEmail = 'me@example.com';
}

describe('BackupScreen — on this phone', () => {
  it('lists snapshots with their kind, record count and size', () => {
    render(<BackupScreen />);
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByText('Manual')).toBeTruthy();
    expect(screen.getByText('40 records · 4 KB')).toBeTruthy();
    expect(screen.getByText('1 record · 1 KB')).toBeTruthy();
  });

  it('shows an empty state when there are no snapshots', () => {
    mockSnapshots.snapshots = [];
    render(<BackupScreen />);
    expect(screen.getByText('No snapshots yet.')).toBeTruthy();
  });

  it('takes a manual snapshot', async () => {
    mockSnapshots.create.mockResolvedValue(true);
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId('backup-snapshot-now'));

    await waitFor(() => expect(mockSnapshots.create).toHaveBeenCalledTimes(1));
    expect(mockShow).toHaveBeenCalledWith('Snapshot saved on this phone.');
  });

  it('restores a snapshot only after the confirm modal', async () => {
    mockSnapshots.restore.mockResolvedValue(true);
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId(`backup-snapshot-restore-${DAILY.id}`));

    expect(screen.getByText('Restore this snapshot?')).toBeTruthy();
    expect(mockSnapshots.restore).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('backup-confirm'));

    await waitFor(() => expect(mockSnapshots.restore).toHaveBeenCalledWith(DAILY.id));
    expect(mockShow).toHaveBeenCalledWith('Snapshot restored.');
    expect(screen.queryByTestId('backup-confirm')).toBeNull();
  });

  it('cancelling the confirm modal restores nothing', () => {
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId(`backup-snapshot-restore-${DAILY.id}`));
    fireEvent.press(screen.getByTestId('backup-cancel'));

    expect(screen.queryByTestId('backup-confirm')).toBeNull();
    expect(mockSnapshots.restore).not.toHaveBeenCalled();
  });

  it('tells a signed-in user that cloud-only records stay in the cloud', () => {
    signIn();
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId(`backup-snapshot-restore-${DAILY.id}`));

    expect(screen.getByText(/stay in your cloud backup/)).toBeTruthy();
  });

  it('reports a failed restore', async () => {
    mockSnapshots.restore.mockResolvedValue(false);
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId(`backup-snapshot-restore-${DAILY.id}`));
    fireEvent.press(screen.getByTestId('backup-confirm'));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith('Restore failed. Your data was not changed.'),
    );
  });

  it('deletes a snapshot after confirming', async () => {
    mockSnapshots.remove.mockResolvedValue(true);
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId(`backup-snapshot-delete-${MANUAL.id}`));
    expect(screen.getByText('Delete this snapshot?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('backup-confirm'));

    await waitFor(() => expect(mockSnapshots.remove).toHaveBeenCalledWith(MANUAL.id));
    expect(mockShow).toHaveBeenCalledWith('Snapshot deleted.');
  });
});

describe('BackupScreen — cloud backup', () => {
  it('links a signed-out user to Settings to sign in', () => {
    render(<BackupScreen />);

    expect(screen.queryByTestId('backup-cloud-restore')).toBeNull();
    fireEvent.press(screen.getByTestId('backup-cloud-sign-in'));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('shows the account and backs up on demand when signed in', () => {
    signIn();
    render(<BackupScreen />);

    expect(screen.getByText('Signed in as me@example.com')).toBeTruthy();
    expect(screen.getByText('Not backed up yet.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('backup-cloud-now'));

    expect(mockCloud.syncNow).toHaveBeenCalledTimes(1);
  });

  it('restores from the cloud after confirming and refreshes the snapshot list', async () => {
    signIn();
    mockCloudRestore.mockResolvedValue({
      ok: true,
      restored: 12,
      lastSyncedAt: '2026-10-02T09:00:00.000Z',
    });
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId('backup-cloud-restore'));
    expect(screen.getByText('Replace this phone’s data with your cloud backup?')).toBeTruthy();
    expect(mockCloudRestore).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('backup-confirm'));

    await waitFor(() => expect(mockCloudRestore).toHaveBeenCalledTimes(1));
    expect(mockShow).toHaveBeenCalledWith('Data restored from your cloud backup.');
    expect(mockSnapshots.refresh).toHaveBeenCalled();
    expect(await screen.findByText(/Last backup/)).toBeTruthy();
  });

  it('explains why a cloud restore did nothing', async () => {
    signIn();
    mockCloudRestore.mockResolvedValue({
      ok: false,
      restored: 0,
      lastSyncedAt: null,
      error: 'cloud-empty',
    });
    render(<BackupScreen />);

    fireEvent.press(screen.getByTestId('backup-cloud-restore'));
    fireEvent.press(screen.getByTestId('backup-confirm'));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith('Your cloud backup is empty, so nothing was restored.'),
    );
  });
});

describe('BackupScreen — French', () => {
  it('renders the screen in French', async () => {
    await i18n.changeLanguage('fr');
    render(<BackupScreen />);

    expect(screen.getByText('Sauvegarde et restauration')).toBeTruthy();
    expect(screen.getByText('Quotidienne')).toBeTruthy();
    expect(screen.getByText('40 enregistrements · 4 Ko')).toBeTruthy();
    expect(screen.getByText('Se connecter pour sauvegarder')).toBeTruthy();
  });
});

describe('BackupScreen — one restore at a time', () => {
  it('disables restore from cloud while a snapshot action runs', () => {
    signIn();
    mockSnapshots.isBusy = true;
    render(<BackupScreen />);

    expect(screen.getByTestId('backup-cloud-restore')).toBeDisabled();
  });
});
