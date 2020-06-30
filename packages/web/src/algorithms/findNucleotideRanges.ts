import type { Nucleotide, NucleotideRange } from './types'

interface Found {
  readonly begin: number
  readonly nuc: Nucleotide
}

export type SearchPredicate = (character: Nucleotide) => boolean

/**
 * Finds all contiguous ranges of a given character in a given string. Also supports functions as a condition.
 * The return result contains ranges in form `{ character, begin, end }`
 */
export function findNucleotideRanges(str: string, condition: Nucleotide | SearchPredicate): NucleotideRange[] {
  if (process.env.NODE_ENV === 'development' && str.length === 0) {
    console.warn(`findCharacterRanges: the searched string is empty. This is not an error by itself, but may indicate bugs in the caller code`) // prettier-ignore
  }

  let actualCondition = (nuc: Nucleotide) => condition === nuc
  if (typeof condition === 'function') {
    actualCondition = condition
  }

  const result: NucleotideRange[] = []

  const { length } = str

  let i = 0
  let found: Found | undefined
  while (i < length) {
    let nuc = str[i] as Nucleotide

    // find beginning of matching range
    if (actualCondition(nuc)) {
      found = { begin: i, nuc }
    }

    if (found) {
      // rewind forward to the end of matching range
      while (nuc === found.nuc) {
        ++i
        nuc = str[i] as Nucleotide
      }

      result.push({ begin: found.begin, nuc: found.nuc, end: i })
      found = undefined
    } else {
      ++i
    }
  }

  return result
}
