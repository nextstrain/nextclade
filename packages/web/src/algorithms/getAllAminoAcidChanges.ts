/* eslint-disable unicorn/prefer-string-slice */

import { inRange } from 'lodash'

import { notUndefined } from 'src/helpers/notUndefined'

import type { Base } from './run'
import type { GeneMapDatum } from './geneMap'
import { getCodon } from './codonTable'

export function aminoAcidChange(pos: number, queryAllele: string, refSequence: string, gene: GeneMapDatum) {
  // check that the positions is infact part of this gene
  if (!inRange(pos, gene.start, gene.end)) {
    return undefined
  }

  // determine the reading frame and codon number in gene.
  const frame = (pos - gene.start + 1) % 3
  const codon = (pos - gene.start + 1 - frame) / 3
  // pull out the codons and construct the query codon by inserting the allele
  const refCodon = refSequence.substring(pos - frame, pos - frame + 3)
  const queryBegin = refCodon.substring(0, frame)
  const queryEnd = refCodon.substring(frame + 1, 3)
  const queryCodon = queryBegin + queryAllele + queryEnd

  const refAA = getCodon(refCodon)
  const queryAA = getCodon(queryCodon)

  if (refAA !== queryAA) {
    return undefined
  }

  return { refAA, queryAA, codon }
}

export interface AminoacidSubstitution {
  refAA: string
  queryAA: string
  codon: number
}

export function getAminoAcidChanges(
  pos: number,
  queryAllele: string,
  refSequence: string,
  geneMap: GeneMapDatum[],
): AminoacidSubstitution[] {
  return geneMap.map((gene) => aminoAcidChange(pos, queryAllele, refSequence, gene)).filter(notUndefined)
}

export interface AminoacidSubstitutions {
  position: string
  allele: string
  substitutions: AminoacidSubstitution[]
}

export function getAllAminoAcidChanges(
  mutations: Record<string, Base>,
  refSequence: string,
  geneMap: GeneMapDatum[],
): AminoacidSubstitutions[] {
  return Object.entries(mutations).map(([position, allele]) => ({
    position,
    allele,
    substitutions: getAminoAcidChanges(Number.parseInt(position, 10), allele, refSequence, geneMap),
  }))
}
