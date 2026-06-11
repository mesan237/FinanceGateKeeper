/**
 * Inserts space-separated thousands groups into a string of digits, following
 * the West/Central African FR-style convention (e.g. "50000" -> "50 000").
 * The input is assumed to be digits only (no sign, no separators); callers that
 * format signed or suffixed values compose this with their own prefix/suffix.
 *
 * @param digits A string containing only the characters 0-9.
 * @returns The same digits with a space before every group of three from the right.
 */
export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
