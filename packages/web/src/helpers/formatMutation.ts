import type { Aminoacid, AminoacidDeletion, AminoacidSubstitution, NucleotideSubstitution } from 'src/algorithms/types'
import { AMINOACID_GAP } from 'src/algorithms/codonTable'

export function formatMutation({ pos, queryNuc, refNuc }: NucleotideSubstitution) {
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
  // NOTE: by convention, nucleotides are numbered starting from 1, however our arrays are 0-based
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
