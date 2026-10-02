import type { backup as en } from '@/i18n/locales/en/backup';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the Backup & Restore screen. */
export const backup: Translation<typeof en> = {
  title: 'Sauvegarde et restauration',
  cloud: {
    title: 'Sauvegarde cloud',
    subtitle:
      'Garde une copie de vos données dans votre compte cloud. Elle survit à la perte de votre téléphone.',
    signedOut: 'Connectez-vous à un compte cloud pour sauvegarder vos données hors de ce téléphone.',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
    signOut: 'Se déconnecter',
    email: 'E-mail',
    emailLabel: 'E-mail du compte cloud',
    password: 'Mot de passe',
    passwordLabel: 'Mot de passe du compte cloud',
    signedInAs: 'Connecté en tant que {{email}}',
    lastBackup: 'Dernière sauvegarde le {{date}}',
    neverBackedUp: 'Pas encore sauvegardé.',
    backUpNow: 'Sauvegarder maintenant',
    backingUp: 'Sauvegarde…',
    restore: 'Restaurer depuis le cloud',
  },
  local: {
    title: 'Sur ce téléphone',
    subtitle: 'Une copie est prise automatiquement chaque jour, et les 7 dernières sont conservées.',
    note: 'Les copies restent sur ce téléphone et sont supprimées si l’application est désinstallée.',
    backUpNow: 'Prendre une copie maintenant',
    empty: 'Aucune copie pour l’instant.',
    restore: 'Restaurer',
    delete: 'Supprimer la copie',
    records_one: '{{count}} enregistrement',
    records_other: '{{count}} enregistrements',
    sizeKb: '{{size}} Ko',
  },
  reasons: {
    daily: 'Quotidienne',
    manual: 'Manuelle',
    beforeRestore: 'Avant restauration',
  },
  confirm: {
    snapshotTitle: 'Restaurer cette copie ?',
    snapshotBody:
      'Les données de ce téléphone seront remplacées par la copie du {{date}}. Une copie de vos données actuelles est d’abord enregistrée, vous pourrez donc annuler depuis cette même liste.',
    snapshotCloudNote:
      'Les enregistrements ajoutés après cette copie restent dans votre sauvegarde cloud. « Restaurer depuis le cloud » les ramènerait.',
    snapshotConfirm: 'Restaurer',
    cloudTitle: 'Remplacer les données de ce téléphone par votre sauvegarde cloud ?',
    cloudBody:
      'Tout ce qui se trouve sur ce téléphone sera remplacé par votre copie cloud, et les modifications pas encore sauvegardées seraient perdues. Une copie de vos données actuelles est d’abord enregistrée ici, vous pourrez donc annuler.',
    cloudConfirm: 'Remplacer par la copie cloud',
    deleteTitle: 'Supprimer cette copie ?',
    deleteBody: 'La copie du {{date}} sera supprimée de ce téléphone. Cette action est irréversible.',
  },
  toasts: {
    snapshotTaken: 'Copie enregistrée sur ce téléphone.',
    snapshotFailed: 'Impossible de prendre une copie.',
    snapshotRestored: 'Copie restaurée.',
    cloudRestored: 'Données restaurées depuis votre sauvegarde cloud.',
    restoreFailed: 'La restauration a échoué. Vos données n’ont pas été modifiées.',
    deleted: 'Copie supprimée.',
    deleteFailed: 'Impossible de supprimer la copie.',
  },
  cloudErrors: {
    notSignedIn: 'Connectez-vous d’abord à un compte cloud.',
    cloudError: 'Impossible de joindre votre sauvegarde cloud. Vos données n’ont pas été modifiées.',
    cloudEmpty: 'Votre sauvegarde cloud est vide, rien n’a donc été restauré.',
    restoreFailed: 'La restauration a échoué. Vos données n’ont pas été modifiées.',
  },
};
