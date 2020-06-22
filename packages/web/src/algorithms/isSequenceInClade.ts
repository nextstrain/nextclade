import type { DeepReadonly } from 'ts-essentials'

import type { Base, Substitution } from './types'

export function isSequenceInClade(
  cladeAlleles: DeepReadonly<Substitution[]>,
  mutations: Record<string, Base>,
  reference: string,
) {
  return cladeAlleles.every(({ allele, pos }) => {
    // clade definition by nextstrain use one-based indices, hence substract 1 to retrieve allele in reference and mutations object
    const state = mutations[pos - 1] ?? reference[pos - 1]
    return state === allele
  })
}
