import 'i18next';

import type { resources } from './resources';

// Types `t()` against the English catalogue: an unknown key is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
