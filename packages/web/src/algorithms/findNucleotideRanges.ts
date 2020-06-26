import type { Nucleotide, NucleotideRange } from './types'

/**
 * Finds all contiguous ranges of a given character in a given string.
 * The return result contains ranges in form `{ begin, end}`
 */
export function findNucleotideRanges(str: string, character: Nucleotide): NucleotideRange[] {
  if (process.env.NODE_ENV === 'development' && str.length === 0) {
    console.warn(`findCharacterRanges: the searched string is empty. This is not an error by itself, but may indicate bugs in the caller code`) // prettier-ignore
  }

  const result: NucleotideRange[] = []

  const { length } = str
  let begin: number | undefined
  for (let i = 0; i < length; ++i) {
    if (character === str[i]) {
      begin = begin ?? i
    } else if (begin !== undefined) {
      const end = i
      result.push({ character, range: { begin, end } })
      begin = undefined
    }
  }

  if (begin !== undefined) {
    result.push({ character, range: { begin, end: begin + 1 } })
  }

  return result
}
