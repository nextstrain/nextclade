/* eslint-disable unicorn/prefer-string-slice */

import { inRange } from 'lodash'

import { notUndefined } from 'src/helpers/notUndefined'

import type { AminoacidSubstitution, SubstitutionsWithAminoacids, Gene, NucleotideSubstitution } from './types'
import { getCodon } from './codonTable'

export function aminoAcidChange(pos: number, queryAllele: string, refSequence: string, gene: Gene) {
  const { range: { begin, end } } = gene // prettier-ignore

  // check that the positions is infact part of this gene
  if (!inRange(pos, begin, end)) {
    return undefined
  }

  // determine the reading frame and codon number in
  const frame = (pos - begin + 1) % 3
  const codon = (pos - begin + 1 - frame) / 3
  // pull out the codons and construct the query codon by inserting the allele
  const refCodon = refSequence.substring(pos - frame, pos - frame + 3)
  const queryBegin = refCodon.substring(0, frame)
  const queryEnd = refCodon.substring(frame + 1, 3)
  const queryCodon = queryBegin + queryAllele + queryEnd

  const refAA = getCodon(refCodon)
  const queryAA = getCodon(queryCodon)

  if (refAA === queryAA) {
    return undefined
  }

  return { refAA, queryAA, codon, gene: gene.name }
}

export function getAminoAcidChanges(
  pos: number,
  queryAllele: string,
  refSequence: string,
  geneMap: Gene[],
): AminoacidSubstitution[] {
  return geneMap.map((gene) => aminoAcidChange(pos, queryAllele, refSequence, gene)).filter(notUndefined)
}

export function getAllAminoAcidChanges(
  mutations: NucleotideSubstitution[],
  refSequence: string,
  geneMap: Gene[],
): SubstitutionsWithAminoacids[] {
  return mutations.map(({ pos, queryNuc, refNuc }) => ({
    pos,
    refNuc,
    queryNuc,
    aaSubstitutions: getAminoAcidChanges(pos, queryNuc, refSequence, geneMap),
  }))
}
