import { Nucleotide, NucleotideLocation, PcrPrimer } from '../types'

import { notUndefined } from '../../helpers/notUndefined'

export const COMPLEMENTS = new Map(
  Object.entries({
    A: 'T',
    C: 'G',
    G: 'C',
    T: 'A',
    Y: 'R',
    R: 'Y',
    W: 'W',
    S: 'S',
    K: 'M',
    M: 'K',
    D: 'H',
    V: 'B',
    H: 'D',
    B: 'V',
    N: 'N',
  }),
)

export function complementNuc(nuc: string) {
  const complement = COMPLEMENTS.get(nuc)
  if (!complement) {
    console.warn(`Warning: unknown nucleotide "${nuc}"`)
  }

  return COMPLEMENTS.get(nuc)
}

export function complementSeq(sequence: string) {
  return sequence.split('').reverse().map(complementNuc).join('')
}

export function findNonACGTs(seq: string, offset = 0) {
  return seq.split('').reduce((result, nuc, i) => {
    if (!['A', 'C', 'G', 'T'].includes(nuc)) {
      result.push({ nuc: nuc as Nucleotide, pos: i + offset })
    }
    return result
  }, [] as NucleotideLocation[])
}

export function findPrimerInRootSeq(primerOligonuc: string, rootSeq: string) {
  // TODO: should the search account for particular ambiguous nucleotides instead of making them wildcards?
  const template = primerOligonuc.toUpperCase().replace(/[^ACGT]/g, '.')

  // Find a match (result will be in the named group `found`)
  const maybeMatches = rootSeq.matchAll(RegExp(`(?<found>${template})`, 'g'))

  return [...maybeMatches]
}

export interface PrimerEntries {
  'Country (Institute)': string
  'Target': string
  'Oligonucleotide': string
  'Sequence': string
}

export function convertPcrPrimers(primerEntries: PrimerEntries[], rootSeq: string): PcrPrimer[] {
  return primerEntries
    .map(({ 'Sequence': primerOligonuc, 'Oligonucleotide': name, 'Country (Institute)': source, 'Target': target }) => {
      let primerOligonucMaybeReverseComplemented = primerOligonuc
      if (name.endsWith('_R')) {
        primerOligonucMaybeReverseComplemented = complementSeq(primerOligonucMaybeReverseComplemented)
      }

      let matches = findPrimerInRootSeq(primerOligonucMaybeReverseComplemented, rootSeq)

      if (matches.length === 0) {
        // Not found. Retry with reverse-complement.
        primerOligonucMaybeReverseComplemented = complementSeq(primerOligonucMaybeReverseComplemented)
        matches = findPrimerInRootSeq(primerOligonucMaybeReverseComplemented, rootSeq)

        if (matches.length === 0) {
          // TODO: is this okay if we did not find a match?
          console.warn(`Warning: no match found for primer ${name} (${primerOligonuc})`)
        }

        return undefined
      }

      if (matches.length > 1) {
        // TODO: More than 1 match is also bad?
        console.warn(`Warning: more than one match found (namely ${matches.length}) for primer ${name} (${primerOligonuc}). Taking first, ignoring ${matches.length - 1} subsequent matches.`) // prettier-ignore
      }

      const match = matches[0]
      const begin = match.index
      const rootOligonuc = match.groups?.found

      if (!begin) {
        console.warn(`Warning: unable to find match starting index for primer ${name} (${primerOligonuc}). Ignoring this match.`) // prettier-ignore
        return undefined
      }

      if (!rootOligonuc) {
        console.warn(`Warning: unable to find match string for primer ${name} (${primerOligonuc}). Ignoring this match.`) // prettier-ignore
        return undefined
      }

      const end = begin + primerOligonuc.length

      const nonACGTs = findNonACGTs(primerOligonucMaybeReverseComplemented, begin)

      return { name, target, source, rootOligonuc, primerOligonuc, range: { begin, end }, nonACGTs }
    })
    .filter(notUndefined)
}
