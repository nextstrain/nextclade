import { Range } from 'src/algorithms/types'

// TODO: these functions look like good candidates to become class methods of the `Range`

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

/**
 * Checks if `small` range is strictly nested in the `big` range.
 * NOTE: "strictly" here means that partial intersections and empty intersections are rejected.
 * NOTE: non-commutative
 */
export function contains({ big, small }: { big: Range; small: Range }) {
  // TODO: precondition(small.begin <= small.end)
  // TODO: precondition(big.begin <= big.end)
  return nonEmpty(small) && nonEmpty(big) && small.begin >= big.begin && small.end <= big.end
}

/**
 * Checks if the given number is in the given range
 */
export function inRange(x: number, range: Range) {
  // TODO: precondition(range.begin <= range.end)
  return x >= range.begin && x < range.end
}
