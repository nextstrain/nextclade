import { isNil } from 'lodash'

export function invertMap<K, V>(map: Map<K, V | undefined | null>): Map<V, K[]> {
  const result = new Map<V, K[]>()

  for (const [key, value] of map) {
    if (isNil(value)) {
      continue
    }
    const existing = result.get(value)
    if (existing) {
      existing.push(key)
    } else {
      result.set(value, [key])
    }
  }

  return result
}

/** Extract arrays of keys with nil values from a map  */
export function keysOfNil<K, V>(map: Map<K, V | undefined | null>): K[] {
  return [...map.entries()].filter(([, v]) => isNil(v)).map(([k]) => k)
}
