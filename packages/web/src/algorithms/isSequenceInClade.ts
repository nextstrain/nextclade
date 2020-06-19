import { Base, Substitution } from './run'
import { DeepReadonly } from 'ts-essentials'

export function isSequenceInClade(
  cladeAlleles: DeepReadonly<Substitution[]>,
  mutations: Record<string, Base>,
  reference: string,
) {
  return cladeAlleles.every(({ allele, pos }) => {
    // TODO: verify that `-1` is needed here
    const state = mutations[pos - 1] ?? reference[pos - 1]
    return state === allele
  })
}
