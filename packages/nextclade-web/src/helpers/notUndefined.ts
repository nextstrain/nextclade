/* eslint-disable lodash/prefer-is-nil */

export function notUndefined<T>(x: T | undefined): x is NonNullable<T> {
  return x !== undefined
}

export function notUndefinedOrNull<T>(x: T | undefined | null): x is NonNullable<T> {
  return x !== undefined && x !== null
}

export function filterValuesNotUndefinedOrNull<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => notUndefinedOrNull(value))) as T
}

export function pairValueNotUndefinedOrNull<K, V>(pair: [K, V | undefined | null]): pair is [K, V] {
  return notUndefinedOrNull(pair[1])
}
