import { AminoacidSubstitution, NucleotideSubstitution } from 'src/algorithms/types'

export function formatMutation({ pos, queryNuc, refNuc }: NucleotideSubstitution) {
  // NOTE: by convention, nucleotides are numbered starting from 1, however our arrays are 0-based
  const positionOneBased = pos + 1
  return `${refNuc}${positionOneBased}${queryNuc}`
}

export function formatAAMutationWithoutGene({ refAA, codon, queryAA }: Omit<AminoacidSubstitution, 'gene'>) {
  // NOTE: by convention, nucleotides are numbered starting from 1, however our arrays are 0-based
  const codonOneBased = codon + 1
  return `${refAA}${codonOneBased}${queryAA}`
}

export function formatAAMutation({ gene, refAA, codon, queryAA }: AminoacidSubstitution) {
  const notation = formatAAMutationWithoutGene({ refAA, codon, queryAA })
  return `${gene}:${notation}`
}
