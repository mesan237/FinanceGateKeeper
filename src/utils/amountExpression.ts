import { groupDigits } from '@/utils/groupDigits';

/** The four operators an amount field understands, as they are shown. */
export type AmountOperator = '+' | '−' | '×' | '÷';

type Token = string;

/** What a phone keyboard may type for each operator. */
const OPERATOR_OF: Readonly<Record<string, AmountOperator>> = {
  '+': '+',
  '-': '−',
  '–': '−',
  '−': '−',
  x: '×',
  X: '×',
  '*': '×',
  '×': '×',
  '/': '÷',
  '÷': '÷',
};

function isOperator(token: Token): token is AmountOperator {
  return token === '+' || token === '−' || token === '×' || token === '÷';
}

/**
 * Splits typed text into numbers and operators: anything else is dropped, an
 * operator before the first number is ignored, and of two operators in a row
 * the last one wins. A trailing operator is kept, as the user is still typing.
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const char of text) {
    if (char >= '0' && char <= '9') {
      const last = tokens[tokens.length - 1];
      if (last !== undefined && !isOperator(last)) tokens[tokens.length - 1] = last + char;
      else tokens.push(char);
      continue;
    }
    const operator = OPERATOR_OF[char];
    if (!operator || tokens.length === 0) continue;
    if (isOperator(tokens[tokens.length - 1])) tokens[tokens.length - 1] = operator;
    else tokens.push(operator);
  }
  return tokens;
}

function join(tokens: Token[]): string {
  return tokens.map((t) => (isOperator(t) ? t : groupDigits(String(Number(t))))).join(' ');
}

/**
 * Tidies what was typed in an amount field for display: each number grouped in
 * thousands, operators shown as + − × ÷ with a space either side (VS-93).
 */
export function formatExpression(text: string): string {
  return join(tokenize(text));
}

/**
 * Adds an operator key's sign after the typed text, replacing an operator that
 * has no number after it yet. Before the first number it does nothing.
 */
export function appendOperator(text: string, operator: AmountOperator): string {
  const tokens = tokenize(text);
  if (tokens.length === 0) return '';
  if (isOperator(tokens[tokens.length - 1])) tokens[tokens.length - 1] = operator;
  else tokens.push(operator);
  return join(tokens);
}

/** The outcome of reading an amount field's text. */
export interface AmountEvaluation {
  /** Whole FCFA above zero, or null when the text gives no such amount. */
  total: number | null;
  /** True when the text is a sum with at least one operator, not a plain amount. */
  isCalculation: boolean;
  /** True when a division left a fraction that was rounded to whole FCFA. */
  rounded: boolean;
}

/**
 * Works out the amount an amount field holds (VS-93): a plain figure, or a sum
 * such as "350 × 2 + 200" computed with × and ÷ before + and −, as on a
 * calculator. No `eval`: only digits and the four operators are read. The total
 * is rounded to whole FCFA; zero, a negative result and a division by zero give
 * no total. An operator still waiting for its number is ignored.
 */
export function evaluateAmount(text: string): AmountEvaluation {
  const tokens = tokenize(text);
  if (tokens.length > 0 && isOperator(tokens[tokens.length - 1])) tokens.pop();
  const isCalculation = tokens.length > 1;
  if (tokens.length === 0) return { total: null, isCalculation, rounded: false };

  // First pass: × and ÷ fold into the term before them.
  const terms: number[] = [Number(tokens[0])];
  const signs: AmountOperator[] = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i] as AmountOperator;
    const value = Number(tokens[i + 1]);
    if (operator === '×') terms[terms.length - 1] *= value;
    else if (operator === '÷') {
      if (value === 0) return { total: null, isCalculation, rounded: false };
      terms[terms.length - 1] /= value;
    } else {
      signs.push(operator);
      terms.push(value);
    }
  }
  // Second pass: + and −, left to right.
  const exact = terms.slice(1).reduce((sum, term, i) => (signs[i] === '+' ? sum + term : sum - term), terms[0]);
  const total = Math.round(exact);
  return {
    total: total > 0 ? total : null,
    isCalculation,
    rounded: total > 0 && !Number.isInteger(exact),
  };
}
