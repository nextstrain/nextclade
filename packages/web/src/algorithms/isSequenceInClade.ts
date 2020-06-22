import type { DeepReadonly } from 'ts-essentials'

import type { Nucleotide, Substitution } from './types'

export function isSequenceInClade(
  cladeAlleles: DeepReadonly<Substitution[]>,
  mutations: Record<string, Nucleotide>,
  reference: string,
) {
  return cladeAlleles.every(({ allele, pos }) => {
    // clade definition by nextstrain use one-based indices, hence substract 1 to retrieve allele in reference and mutations object
    const posZeroBased = pos - 1
    const state = mutations[posZeroBased] ?? reference[posZeroBased]
    return state === allele
  })
}
