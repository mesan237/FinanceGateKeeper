const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a YYYY-MM-DD string as "DD MMM YYYY" (e.g. "30 May 2026"). Throws
 * when the input does not match the expected shape so format errors surface
 * at the call site rather than silently rendering "NaN".
 */
export function formatIsoDate(iso: string): string {
  if (!ISO_DATE_PATTERN.test(iso)) {
    throw new Error(`formatIsoDate: expected YYYY-MM-DD, received "${iso}"`);
  }
  const [year, month, day] = iso.split('-');
  return `${day} ${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

/**
 * Returns the current local date as a YYYY-MM-DD string. Uses Date.now so
 * tests can patch the clock without monkey-patching the entire Date object.
 */
export function todayIso(): string {
  const now = new Date(Date.now());
  const year = now.getFullYear().toString().padStart(4, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
