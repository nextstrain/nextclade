export function getNucleotideComposition(alignedQuery: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (let i = 0; i < alignedQuery.length; i++) {
    const char = alignedQuery[i]
    if (result[char] === undefined) {
      result[char] = 1
    } else {
      result[char]++
    }
  }
  return result
}
