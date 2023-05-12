import type { Aminoacid, AminoacidDeletion, AminoacidSubstitution, NucSub, StopCodonLocation } from 'src/types'
import { AMINOACID_GAP } from 'src/constants'

export function formatMutation({ pos, queryNuc, refNuc }: NucSub) {
  // NOTE: by convention, nucleotides are numbered starting from 1, however our arrays are 0-based
  const positionOneBased = pos + 1
  return `${refNuc}${positionOneBased}${queryNuc}`
}

export interface FormatAAMutationWithoutGeneParams {
  refAA: Aminoacid
  queryAA: Aminoacid
  codon: number
}

export function formatAAMutationWithoutGene({ refAA, codon, queryAA }: FormatAAMutationWithoutGeneParams) {
  // NOTE: by convention, codons are numbered starting from 1, however our arrays are 0-based
  const codonOneBased = codon + 1
  return `${refAA}${codonOneBased}${queryAA}`
}

export function formatAAMutation({ gene, refAA, codon, queryAA }: AminoacidSubstitution) {
  const notation = formatAAMutationWithoutGene({ refAA, codon, queryAA })
  return `${gene}:${notation}`
}

export function formatAADeletion({ gene, refAA, codon }: AminoacidDeletion) {
  const notation = formatAAMutationWithoutGene({ refAA, codon, queryAA: AMINOACID_GAP })
  return `${gene}:${notation}`
}

export function formatStopCodon({ geneName, codon }: StopCodonLocation) {
  // NOTE: by convention, codons are numbered starting from 1, however our arrays are 0-based
  const codonOneBased = codon + 1
  return `${geneName}:${codonOneBased}`
}
