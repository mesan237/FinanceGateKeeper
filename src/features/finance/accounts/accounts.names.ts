import i18n from 'i18next';

import type { Account } from './accounts.types';

/**
 * The name to show for a wallet. The seeded cash wallet is stored as "Cash", so
 * it reads « Espèces » in French; any name the user gave a wallet stays as typed.
 */
export function displayAccountName(account: Pick<Account, 'name' | 'type'>): string {
  return account.type === 'cash' && account.name === 'Cash'
    ? i18n.t('types.cash', { ns: 'accounts' })
    : account.name;
}
