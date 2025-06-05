import { isUndefined } from 'lodash'

export function notUndefined<T>(x: T | undefined): x is NonNullable<T> {
  return x !== undefined
}

export function notUndefinedOrNull<T>(x: T | undefined | null): x is NonNullable<T> {
  return x !== undefined && x !== null
}

export function pairValueNotUndefinedOrNull<K, V>(pair: [K, V | undefined | null]): pair is [K, V] {
  return notUndefinedOrNull(pair[1])
}

/** If value is not undefined or null, map it according to a fn, otherwise return undefined */
export function mapMaybe<T, U>(value: T | undefined | null, fn: (v: NonNullable<T>) => U): U | undefined {
  if (isNil(value)) {
    return undefined
  }
  return fn(value as NonNullable<T>)
}
