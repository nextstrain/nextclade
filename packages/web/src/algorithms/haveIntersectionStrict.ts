import { Range } from 'src/algorithms/types'

export function nonEmpty(a: Range) {
  return a.begin < a.end
}

/**
 * Checks if two ranges have a non-empty intersection range
 */
export function haveIntersectionStrict(a: Range, b: Range) {
  // TODO: precondition(a.begin <= a.end)
  // TODO: precondition(b.begin <= b.end)
  return nonEmpty(a) && nonEmpty(b) && a.begin < b.end && b.begin < a.end
}
