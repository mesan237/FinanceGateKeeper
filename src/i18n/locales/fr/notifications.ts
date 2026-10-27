import type { notifications as en } from '@/i18n/locales/en/notifications';
import type { Translation } from '@/i18n/translation.types';

/** French copy for local notifications and in-app alerts. */
export const notifications: Translation<typeof en> = {
  channel: {
    name: 'Rappels quotidiens',
    description: 'Un rappel les jours où aucune dépense n’est encore notée.',
  },
  dailyReminder: {
    title: 'Aucune dépense notée aujourd’hui',
    body: 'Une dépense, ou rien dépensé ? Notez-le en quelques secondes.',
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
    bodyInstalmentDueSoon: '{{person}} — échéance {{n}} : {{amount}} à payer le {{date}}.',
    bodyInstalmentsOverdue_one: '{{person}} — {{count}} échéance en retard ({{amount}}).',
    bodyInstalmentsOverdue_other: '{{person}} — {{count}} échéances en retard ({{amount}}).',
  },
  plannedDue: {
    title: 'Achat prévu',
    body: 'Vous avez des achats prévus bientôt.',
    bodySoon_one: '{{list}} : {{count}} article à acheter avant le {{date}} ({{amount}}).',
    bodySoon_other: '{{list}} : {{count}} articles à acheter avant le {{date}} ({{amount}}).',
    bodyToday_one: "{{list}} : {{count}} article à acheter aujourd'hui ({{amount}}).",
    bodyToday_other: "{{list}} : {{count}} articles à acheter aujourd'hui ({{amount}}).",
    bodyOverdue_one: '{{list}} : {{count}} article toujours à acheter, prévu le {{date}}.',
    bodyOverdue_other: '{{list}} : {{count}} articles toujours à acheter, prévus le {{date}}.',
  },
  tontineDue: {
    title: 'Cotisation de tontine',
    body: 'Une cotisation de tontine est due.',
    bodySoon: '{{tontine}} : {{amount}} à payer le {{date}}.',
    bodyToday: "{{tontine}} : {{amount}} à payer aujourd'hui.",
    bodyOverdue_one: '{{tontine}} : {{count}} cotisation en retard ({{amount}}).',
    bodyOverdue_other: '{{tontine}} : {{count}} cotisations en retard ({{amount}}).',
  },
};
