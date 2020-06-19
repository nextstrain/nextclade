import { GeneMapDatum } from './geneMap'
import { getCodon } from './codonTable'

import { Base } from './run'

export function aminoAcidChange(pos: number, queryAllele: string, refSequence: string, gene: GeneMapDatum) {
  // check that the positions is infact part of this gene
  if (pos < gene.start && pos >= gene.end) {
    return undefined
  }

  // determine the reading frame and codon number in gene.
  const frame = (pos - gene.start + 1) % 3
  const codon = (pos - gene.start + 1 - frame) / 3
  // pull out the codons and construct the query codon by inserting the allele
  const refCodon = refSequence.substring(pos - frame, pos - frame + 3)
  const queryCodon = refCodon.substring(0, frame) + queryAllele + refCodon.substring(frame + 1, 3)

  const refAA = getCodon(refCodon)
  const queryAA = getCodon(queryCodon)

  if (refAA !== queryAA) {
    return undefined
  }

  return { refAA, queryAA, codon }
}

export function getAminoAcidChanges(pos: number, queryAllele: string, refSequence: string, geneMap: GeneMapDatum[]) {
  return geneMap.map((gene) => aminoAcidChange(pos, queryAllele, refSequence, gene)).filter(Boolean)
}

export interface AminoacidSubstitution {
  refAA: string
  queryAA: string
  codon: number
}

export function getAllAminoAcidChanges(mutations: Record<string, Base>, refSequence: string, geneMap: GeneMapDatum[]) {
  Object.entries(mutations).map(([position, allele]) => ({
    position,
    allele,
    substitutions: getAminoAcidChanges(Number.parseInt(position, 10), allele, refSequence, geneMap),
  }))
}
