import type { notifications as en } from '@/i18n/locales/en/notifications';
import type { Translation } from '@/i18n/translation.types';

/** French copy for local notifications and in-app alerts. */
export const notifications: Translation<typeof en> = {
  channel: {
    name: 'Rappels quotidiens',
    description: 'Rappels de fin de journée pour noter vos dépenses.',
  },
  dailyReminder: {
    title: 'Notez vos dépenses',
    body: "Prenez quelques secondes pour noter les dépenses d'aujourd'hui avant la fin de la journée.",
  },
  zeroDayCheck: {
    title: "Vous n'avez rien dépensé aujourd'hui ?",
    body: "Confirmez que vous n'avez rien dépensé aujourd'hui, ou notez ce que vous avez dépensé.",
  },
  overBudget: {
    title: 'Budget dépassé',
    body: 'Cette dépense vous fait dépasser votre budget.',
    bodyCategory: 'Cette dépense vous fait dépasser votre budget « {{category}} » de {{amount}}.',
    bodyMonth: 'Cette dépense vous fait dépasser votre budget mensuel de dépenses de {{amount}}.',
  },
  debtDueDate: {
    title: 'Échéance de dette proche',
    body: "Une dette approche de sa date d'échéance.",
    bodyDueSoon: '{{person}} — {{amount}} à rembourser le {{date}}.',
    bodyOverdue: '{{person}} — {{amount}} en retard (échéance le {{date}}).',
  },
};
