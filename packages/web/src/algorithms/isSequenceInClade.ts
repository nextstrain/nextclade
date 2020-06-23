import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideLocation } from './types'

export function isSequenceInClade(
  cladeAlleles: DeepReadonly<NucleotideLocation[]>,
  mutations: NucleotideLocation[],
  reference: string,
) {
  return cladeAlleles.every(({ pos, allele }) => {
    // clade definition by nextstrain use one-based indices, hence substract 1 to retrieve allele in reference and mutations object
    const posZeroBased = pos - 1
    const state = mutations.find(({ pos }) => pos === posZeroBased)?.allele ?? reference[posZeroBased]
    return state === allele
  })
}
