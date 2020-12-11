import { get } from 'lodash'
import { intersection } from '../helpers/setOperations'

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
  if (query === reference || query === 'N' || reference === 'N') {
    return true
  }

  // match ambiguity code in query
  if (IUPACNucCodes[query] && IUPACNucCodes[query].has(reference)) {
    return true
  }

  // match ambiguity code in reference
  if (IUPACNucCodes[reference] && IUPACNucCodes[reference].has(query)) {
    return true
  }

  // if none of the previous matched, match generic ambiguity
  const queryNucs = get(IUPACNucCodes, query)
  const refNucs = get(IUPACNucCodes, reference)
  if (queryNucs && refNucs) {
    return intersection(queryNucs, refNucs).size > 0
  }

  return false
}
