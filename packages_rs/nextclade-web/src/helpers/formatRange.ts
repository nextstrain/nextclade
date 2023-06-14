/* eslint-disable camelcase */
import type { RangeFor_Position } from '_SchemaRoot'

export function formatRange(range: RangeFor_Position) {
  if (range.begin > range.end) {
    console.warn(
      `formatRange: Attempted to format an invalid range: \`[${range.begin}; ${range.end})\`. This is probably a bug.`,
    )
  }

  if (range.begin >= range.end) {
    return 'empty range'
  }

  // NOTE: we (and JavaScript) use 0-based, half-open ranges,
  // but bioinformaticians prefer 1-based, closed ranges.
  // So we convert from "0-based, half-open ranges" to "1-based, closed ranges" here
  const beginOne = range.begin + 1
  const endOne = range.end

  if (endOne === beginOne) {
    return beginOne.toString()
  }
  return `${beginOne}-${endOne}`
}

export function formatRangeMaybeEmpty(range: RangeFor_Position) {
  if (range.begin >= range.end) {
    return '-'
  }

  return formatRange(range)
}
