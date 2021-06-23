export function formatRange(begin: number, end: number) {
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
