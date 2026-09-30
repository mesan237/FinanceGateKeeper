/**
 * The shape a translation must have to mirror the English catalogue: the same
 * keys at every level, with every leaf a string. Typing each French namespace
 * as `Translation<typeof en>` makes a missing or misspelled key a `tsc` error.
 */
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>;
};
