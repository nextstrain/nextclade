import { isNil } from 'lodash'

/**
 * Returns the first element of the array if non array is provided,
 * or `undefined` if empty array is provided, or passes through if
 * a non-array is provided.
 */
export function takeFirstMaybe<T>(maybeArray: T | T[]): T | undefined {
  if (!Array.isArray(maybeArray)) {
    return maybeArray
  }

  if (maybeArray.length > 0) {
    return maybeArray[0]
  }

  return undefined
}

/**
 * Returns:
 *  - array if array is provided
 *  - array of one element if not array is provided
 *  - empty array if `undefined` nil-ish value is provided
 */
export function takeArray<T>(val: T | T[] | undefined): T[] {
  if (Array.isArray(val)) {
    return val
  }

  if (isNil(val)) {
    return []
  }

  return [val]
}
