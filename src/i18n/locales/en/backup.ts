/** Copy for the Backup & Restore screen: cloud backup and on-phone snapshots. */
export const backup = {
  title: 'Backup & Restore',
  cloud: {
    title: 'Cloud backup',
    subtitle: 'Keeps a copy of your data in your cloud account. It survives losing your phone.',
    signedOut: 'Sign in to a cloud account to back up your data off this phone.',
    signIn: 'Sign in to back up',
    signedInAs: 'Signed in as {{email}}',
    lastBackup: 'Last backup {{date}}',
    neverBackedUp: 'Not backed up yet.',
    backUpNow: 'Back up now',
    backingUp: 'Backing up…',
    restore: 'Restore from cloud',
  },
  local: {
    title: 'On this phone',
    subtitle: 'A snapshot is taken automatically each day, and the last 7 are kept.',
    note: 'Snapshots stay on this phone and are removed if the app is uninstalled.',
    backUpNow: 'Take a snapshot now',
    empty: 'No snapshots yet.',
    restore: 'Restore',
    delete: 'Delete snapshot',
    records_one: '{{count}} record',
    records_other: '{{count}} records',
    sizeKb: '{{size}} KB',
  },
  reasons: {
    daily: 'Daily',
    manual: 'Manual',
    beforeRestore: 'Before restore',
  },
  confirm: {
    snapshotTitle: 'Restore this snapshot?',
    snapshotBody:
      'Your data on this phone will be replaced with the snapshot from {{date}}. A copy of your current data is saved first, so you can undo this from the same list.',
    snapshotCloudNote:
      'Records added after this snapshot stay in your cloud backup. Restore from cloud would bring them back.',
    snapshotConfirm: 'Restore',
    cloudTitle: 'Replace this phone’s data with your cloud backup?',
    cloudBody:
      'Everything on this phone will be replaced with your cloud copy, and changes not backed up yet would be lost. A copy of your current data is saved here first, so you can undo this.',
    cloudConfirm: 'Replace with cloud copy',
    deleteTitle: 'Delete this snapshot?',
    deleteBody: 'The snapshot from {{date}} will be removed from this phone. This cannot be undone.',
  },
  toasts: {
    snapshotTaken: 'Snapshot saved on this phone.',
    snapshotFailed: 'Could not take a snapshot.',
    snapshotRestored: 'Snapshot restored.',
    cloudRestored: 'Data restored from your cloud backup.',
    restoreFailed: 'Restore failed. Your data was not changed.',
    deleted: 'Snapshot deleted.',
    deleteFailed: 'Could not delete the snapshot.',
  },
  cloudErrors: {
    notSignedIn: 'Sign in to a cloud account first.',
    cloudError: 'Could not reach your cloud backup. Your data was not changed.',
    cloudEmpty: 'Your cloud backup is empty, so nothing was restored.',
    restoreFailed: 'Restore failed. Your data was not changed.',
  },
};
