import type { AaDel, AaSub, NucSub, StopCodonLocation } from 'src/types'
import { AMINOACID_GAP } from 'src/constants'
import { StrictOmit } from 'ts-essentials'

export function formatMutation({ pos, qryNuc, refNuc }: NucSub) {
  // NOTE: by convention, nucleotides are numbered starting from 1, however our arrays are 0-based
  const positionOneBased = pos + 1
  return `${refNuc}${positionOneBased}${qryNuc}`
}

export function formatAAMutationWithoutGene({ refAa, pos, qryAa }: StrictOmit<AaSub, 'cdsName'>) {
  // NOTE: by convention, codons are numbered starting from 1, however our arrays are 0-based
  const posOneBased = pos + 1
  return `${refAa}${posOneBased}${qryAa}`
}

export function formatAAMutation({ cdsName, refAa, pos, qryAa }: AaSub) {
  const notation = formatAAMutationWithoutGene({ refAa, pos, qryAa })
  return `${cdsName}:${notation}`
}

export function formatAADeletion({ cdsName, refAa, pos }: AaDel) {
  const notation = formatAAMutationWithoutGene({ refAa, pos, qryAa: AMINOACID_GAP })
  return `${cdsName}:${notation}`
}

export function formatStopCodon({ geneName, codon }: StopCodonLocation) {
  // NOTE: by convention, codons are numbered starting from 1, however our arrays are 0-based
  const codonOneBased = codon + 1
  return `${geneName}:${codonOneBased}`
}
