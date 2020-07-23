import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideLocation, NucleotideSubstitution } from './types'

export function isSequenceInClade(
  cladeAlleles: DeepReadonly<NucleotideLocation[]>,
  mutations: NucleotideSubstitution[],
  alignmentStart: number,
  alignmentEnd: number,
  reference: string,
) {
  return cladeAlleles.every(({ pos, nuc }) => {
    // clade definition by nextstrain use one-based indices, hence substract 1 to retrieve allele in reference and mutations object
    const posZeroBased = pos - 1
    // if the position isn't part of the aligned region, we can't call the clade
    // the function will then conservatively return false
    if (posZeroBased < alignmentStart || posZeroBased >= alignmentEnd) {
      return false
    }
    const state = mutations.find(({ pos }) => pos === posZeroBased)?.queryNuc ?? reference[posZeroBased]
    return state === nuc
  })
}
