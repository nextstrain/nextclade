import { intersectionWith, isNil } from 'lodash'

import type { NextcladeResult } from 'src/algorithms/types'
import { parseMutation } from 'src/helpers/parseMutation'
import { notUndefined } from 'src/helpers/notUndefined'
import { NucleotideSubstitution } from 'src/algorithms/types'

import { splitFilterString } from './splitFilterString'

export function mutationsAreEqual(filter: Partial<NucleotideSubstitution>, actual: NucleotideSubstitution) {
  const posMatch = isNil(filter.pos) || (filter.pos ?? -1) === actual.pos
  const refNucMatch = isNil(filter.refNuc) || (filter.refNuc ?? '').toLowerCase() === actual.refNuc.toLowerCase()
  const queryNucMatch =
    isNil(filter.queryNuc) || (filter.queryNuc ?? '').toLowerCase() === actual.queryNuc.toLowerCase()
  return posMatch && refNucMatch && queryNucMatch
}

export function filterByNucleotideMutations(mutationsFilter: string) {
  const mutationFilters = splitFilterString(mutationsFilter).map(parseMutation).filter(notUndefined)

  return (result: NextcladeResult) => {
    if (!result?.result) {
      return false
    }
    const mutations = result.result.analysisResult.substitutions
    return intersectionWith(mutationFilters, mutations, mutationsAreEqual).length > 0
  }
}
