import i18n from 'i18next';

import type { IconName } from '@/constants/icons';

import type { AccountPurpose, AccountType } from './accounts.types';

/** Maps a wallet's type to its chrome icon in `@/constants/icons`. */
export const ACCOUNT_TYPE_ICON: Record<AccountType, IconName> = {
  cash: 'accountCash',
  mobile_money: 'accountMobileMoney',
  bank: 'accountBank',
  card: 'accountCard',
};

/** Human-readable label for a wallet type, in the active UI language. */
export function accountTypeLabel(type: AccountType): string {
  return i18n.t(`types.${type}`, { ns: 'accounts' });
}

/** Human-readable label for a wallet purpose, in the active UI language. */
export function accountPurposeLabel(purpose: AccountPurpose): string {
  return i18n.t(`purposes.${purpose}`, { ns: 'accounts' });
}
