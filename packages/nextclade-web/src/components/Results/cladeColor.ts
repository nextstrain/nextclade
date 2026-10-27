import { isNil } from 'lodash'

/**
 * Return the tree color of the value `value` of a clade-like attribute, or nothing when the value is empty or the tree
 * has no coloring by the attribute
 */
export function getCladeColor(
  scales: ReadonlyMap<string, CladeColorScale>,
  attrKey: string,
  value: string | undefined,
): CladeColor | undefined {
  if (isNil(value) || value === '') {
    return undefined
  }
  return scales.get(attrKey)?.(value)
}

/** Return how the tree draws the tips that have the value `value` of a clade-like attribute */
export type CladeColorScale = (value: string) => CladeColor

/** How the tree draws the tips that have a value of a clade-like attribute */
export interface CladeColor {
  /** Outline color of the tips */
  stroke: string
  /** Fill color of the tips */
  fill: string
  /** Whether the tree knows the value. The tree treats a value such as "unknown" as missing and cannot filter by it */
  isKnown: boolean
}
