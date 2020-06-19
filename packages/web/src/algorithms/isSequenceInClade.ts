import { Base, Substitution } from './run'
import { DeepReadonly } from 'ts-essentials'

export function isSequenceInClade(
  cladeAlleles: DeepReadonly<Substitution[]>,
  mutations: Record<string, Base>,
  reference: string,
) {
  const conditions = cladeAlleles.map((d) => {
    const state = mutations[d.pos - 1] === undefined ? reference[d.pos - 1] : mutations[d.pos - 1]
    return state === d.allele
  })
  return conditions.every((d) => d)
}
