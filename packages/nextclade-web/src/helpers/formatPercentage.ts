/** Format a fraction in [0, 1] as a percentage string, e.g. `0.1234` -> `"12.3%"`. */
export function formatPercentage(fraction: number, precision = 1): string {
  return `${(fraction * 100).toFixed(precision)}%`
}

/** Format `value / total` as a percentage, returning `"0%"` when `total` is zero. */
export function formatPercentageOfTotal(value: number, total: number, precision = 1): string {
  if (total === 0) {
    return '0%'
  }
  return formatPercentage(value / total, precision)
}
