const IUPACNucCodes: Record<string, Set<string>> = {
  A: new Set(['A']),
  C: new Set(['C']),
  G: new Set(['G']),
  T: new Set(['T']),
  R: new Set(['A', 'G']),
  Y: new Set(['C', 'T']),
  S: new Set(['G', 'C']),
  W: new Set(['A', 'T']),
  K: new Set(['G', 'T']),
  M: new Set(['A', 'C']),
  B: new Set(['C', 'G', 'T']),
  D: new Set(['A', 'G', 'T']),
  H: new Set(['A', 'C', 'T']),
  V: new Set(['A', 'C', 'G']),
  N: new Set(['A', 'C', 'G', 'T']),
}

export const canonicalNucleotides = new Set(['A', 'C', 'G', 'T'])

export function isMatch(query: string, reference: string): boolean {
  // simple match or ambiguous
  if (query === reference || query === 'N') {
    return true
  }

  // match specific ambiguity codes
  if (IUPACNucCodes[query] && IUPACNucCodes[reference]) {
    const intersection = new Set()
    for (const elem of IUPACNucCodes[query]) {
      if (IUPACNucCodes[reference].has(elem)) {
        intersection.add(elem)
      }
    }
    return intersection.size > 0
  }

  return false
}
