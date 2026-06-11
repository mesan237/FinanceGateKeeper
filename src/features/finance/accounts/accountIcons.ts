import type { IconName } from '@/constants/icons';

import type { AccountType } from './accounts.types';

/** Maps a wallet's type to its chrome icon in `@/constants/icons`. */
export const ACCOUNT_TYPE_ICON: Record<AccountType, IconName> = {
  cash: 'accountCash',
  mobile_money: 'accountMobileMoney',
  bank: 'accountBank',
  card: 'accountCard',
};

/** Human-readable label for a wallet type. */
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank: 'Bank',
  card: 'Card',
};

/** Human-readable label for a wallet purpose. */
export const ACCOUNT_PURPOSE_LABEL: Record<string, string> = {
  spending: 'Spending',
  saving: 'Saving',
  emergency: 'Emergency',
  general: 'General',
};
