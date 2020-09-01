import { intersectionWith } from 'lodash'

import { parseMutation } from 'src/helpers/parseMutation'
import { notUndefined } from 'src/helpers/notUndefined'
import { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { NucleotideSubstitution } from 'src/algorithms/types'

import { splitFilterString } from './splitFilterString'

export function mutationsAreEqual(filter: Partial<NucleotideSubstitution>, actual: NucleotideSubstitution) {
  const posMatch = filter.pos === undefined || filter.pos === actual.pos
  const refNucMatch = filter.refNuc === undefined || filter.refNuc === actual.refNuc
  const queryNucMatch = filter.queryNuc === undefined || filter.queryNuc === actual.queryNuc
  return posMatch && refNucMatch && queryNucMatch
}

export function filterByNucleotideMutations(mutationsFilter: string) {
  const mutationFilters = splitFilterString(mutationsFilter).map(parseMutation).filter(notUndefined)

  return (result: SequenceAnalysisState) => {
    if (!result?.result) {
      return false
    }
    const mutations = result.result.substitutions
    return intersectionWith(mutationFilters, mutations, mutationsAreEqual).length > 0
  }
}
