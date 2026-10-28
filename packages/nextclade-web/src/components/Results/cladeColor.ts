import { isNil } from 'lodash'
import { tint } from 'polished'
import { gray900 } from 'src/theme'

/** How the results table shows the tree color of a clade-like value */
export type CladeColorStyle = 'circle' | 'badge' | 'none'

/** Styles in the order that the settings offer them */
export const CLADE_COLOR_STYLES: CladeColorStyle[] = ['circle', 'badge', 'none']

/** Return the style named `name`, or nothing when no style has this name */
export function parseCladeColorStyle(name: string): CladeColorStyle | undefined {
  return CLADE_COLOR_STYLES.find((style) => style === name)
}

/** Text color of the badge of a value */
export const CLADE_BADGE_TEXT_COLOR = gray900

/**
 * Return the background of the badge of a value: the tree color mixed with mostly white, so that dark text on it stays
 * legible for any tree color, and the border in the tree color identifies the value
 */
export function getCladeBadgeBackground(color: CladeColor): string {
  return tint(0.75, color.stroke)
}

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
