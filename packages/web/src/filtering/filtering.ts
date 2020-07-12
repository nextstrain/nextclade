import { AlgorithmState, SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { DeepWritable } from 'ts-essentials'
import { parseMutation } from 'src/helpers/parseMutation'
import { notUndefined } from 'src/helpers/notUndefined'
import { intersectionWith } from 'lodash'
import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'
import { formatClades } from 'src/helpers/formatClades'
import { AminoacidSubstitution, NucleotideSubstitution } from 'src/algorithms/types'

const FILTER_DELIMITERS = /[\n\r,;]/gi

export function splitFilter(filter: string) {
  return filter
    .split(FILTER_DELIMITERS)
    .map((f) => f.trim())
    .filter((f) => f !== '')
}

export function getSeqNamesFilterRunner(seqNamesFilter: string) {
  const seqNamesFilters = splitFilter(seqNamesFilter)

  return (result: SequenceAnylysisState) => {
    return seqNamesFilters.some((filter) => result.seqName.includes(filter))
  }
}

export function mutationsAreEqual(filter: Partial<NucleotideSubstitution>, actual: NucleotideSubstitution) {
  const posMatch = filter.pos === undefined || filter.pos === actual.pos
  const refNucMatch = filter.refNuc === undefined || filter.refNuc === actual.refNuc
  const queryNucMatch = filter.queryNuc === undefined || filter.queryNuc === actual.queryNuc
  return posMatch && refNucMatch && queryNucMatch
}

export function getMutationsFilterRunner(mutationsFilter: string) {
  const mutationFilters = splitFilter(mutationsFilter).map(parseMutation).filter(notUndefined)

  return (result: SequenceAnylysisState) => {
    if (!result?.result) {
      return false
    }
    const mutations = result.result.substitutions
    return intersectionWith(mutationFilters, mutations, mutationsAreEqual).length > 0
  }
}

export function aaChangesAreEqual(filter: Partial<AminoacidSubstitution>, actual: AminoacidSubstitution) {
  const geneMatch = filter.gene === undefined || filter.gene === actual.gene
  const posMatch = filter.codon === undefined || filter.codon === actual.codon
  const refNucMatch = filter.refAA === undefined || (filter.refAA as string) === (actual.refAA as string)
  const queryNucMatch = filter.queryAA === undefined || (filter.queryAA as string) === (actual.queryAA as string)
  return geneMatch && posMatch && refNucMatch && queryNucMatch
}

export function getAAFilterRunner(aaFilter: string) {
  const aaFilters = splitFilter(aaFilter).map(parseAminoacidChange).filter(notUndefined)

  return (result: SequenceAnylysisState) => {
    if (!result?.result) {
      return false
    }
    const { aminoacidChanges } = result.result
    return intersectionWith(aaFilters, aminoacidChanges, aaChangesAreEqual).length > 0
  }
}

export function getCladesFilterRunner(cladesFilter: string) {
  const cladesFilters = splitFilter(cladesFilter)

  return (result: SequenceAnylysisState) => {
    if (!result?.result) {
      return false
    }

    const { cladeStr } = formatClades(result.result.clades)
    return cladesFilters.some((filter) => cladeStr.startsWith(filter))
  }
}

export function runFilters(state: AlgorithmState) {
  const {
    results,
    seqNamesFilter,
    mutationsFilter,
    aaFilter,
    cladesFilter,
    hasQcIssuesFilter,
    hasNoQcIssuesFilter,
    hasErrorsFilter,
  } = state

  let filtered = results
  if (seqNamesFilter) {
    filtered = filtered.filter(getSeqNamesFilterRunner(seqNamesFilter))
  }

  if (mutationsFilter) {
    filtered = filtered.filter(getMutationsFilterRunner(mutationsFilter))
  }

  if (aaFilter) {
    filtered = filtered.filter(getAAFilterRunner(aaFilter))
  }

  if (cladesFilter) {
    filtered = filtered.filter(getCladesFilterRunner(cladesFilter))
  }

  if (!hasNoQcIssuesFilter) {
    filtered = filtered.filter(({ result }) => !(result && result.diagnostics.flags.length === 0))
  }

  if (!hasQcIssuesFilter) {
    filtered = filtered.filter(
      ({ result, errors }) => !(errors.length > 0 || (result && result.diagnostics.flags.length > 0)),
    )
  }

  if (!hasErrorsFilter) {
    filtered = filtered.filter(({ errors }) => errors.length === 0)
  }

  return filtered as DeepWritable<typeof filtered>
}
