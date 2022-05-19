export function formatRange(begin: number, end: number) {
  if (begin >= end) {
    console.warn(`formatRange: Attempted to format an invalid range: \`[${begin}; ${end})\`. This is probably a bug.`)
    return 'empty range'
  }

  // NOTE: we (and JavaScript) use 0-based, half-open ranges,
  // but bioinformaticians prefer 1-based, closed ranges.
  // So we convert from "0-based, half-open ranges" to "1-based, closed ranges" here
  const beginOne = begin + 1
  const endOne = end

  if (endOne === beginOne) {
    return beginOne.toString()
  }
  return `${beginOne}-${endOne}`
}

export function formatRangeMaybeEmpty(begin: number, end: number) {
  if (begin >= end) {
    return '-'
  }

  return formatRange(begin, end)
}
