export function formatRange(begin: number, end: number) {
  const beginOne = begin + 1
  const endOne = end + 1

  if (endOne - beginOne < 2) {
    return beginOne.toString()
  }
  return `${beginOne}-${endOne}`
}
