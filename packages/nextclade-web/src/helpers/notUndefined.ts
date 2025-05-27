/* eslint-disable lodash/prefer-is-nil */

import { isUndefined } from 'lodash'

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

/** If value is not undefined, map it according to a fn, otherwise return unmodified (i.e. undefined) */
export function mapMaybe<T, U>(value: T | undefined, fn: (v: T) => U): U | undefined {
  return !isUndefined(value) ? fn(value) : value
}
