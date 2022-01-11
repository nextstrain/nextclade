import { orderBy, partition } from 'lodash'

import { AlgorithmSequenceStatus, SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'

export enum SortCategory {
  id = 'id',
  seqName = 'seqName',
  clade = 'clade',
  qcIssues = 'qcIssues',
  totalMutations = 'totalMutations',
  totalNonACGTNs = 'totalNonACGTNs',
  totalMissing = 'totalMissing',
  totalGaps = 'totalGaps',
  totalInsertions = 'totalInsertions',
  totalFrameShifts = 'totalFrameShifts',
  totalStopCodons = 'totalStopCodons',
}

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export interface Sorting {
  category: SortCategory
  direction: SortDirection
}

export interface SortingKeyBased {
  key: string
  direction: SortDirection
}

export function defaultNumber(direction: SortDirection) {
  return direction === SortDirection.asc ? Infinity : 0
}

export function getClade(res: SequenceAnalysisState) {
  return res.result?.clade ?? '-'
}

export function sortById(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.id, direction)
}

export function sortByName(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.seqName, direction)
}

export function sortByQcIssues(results: SequenceAnalysisState[], direction: SortDirection) {
  // Only sort sequences that are ready (succeeded or failed). Put sequences still being analyzed sequences at the bottom.
  const [ready, rest] = partition(results, (res) =>
    [AlgorithmSequenceStatus.done, AlgorithmSequenceStatus.failed].includes(res.status),
  )

  const readySorted = orderBy(
    ready,
    (res) => {
      // Sort errored sequences as having very bad QC results
      const errorScore = res.errors.length * 1e9
      const qcScore = res.result?.qc?.overallScore ?? defaultNumber(direction)
      return errorScore + qcScore
    },
    direction,
  )

  return [...readySorted, ...rest]
}

export function sortByClade(results: SequenceAnalysisState[], direction: SortDirection) {
  // Only sort sequences that are succeeded. Put errored sequences and sequences still being analyzed at the bottom.
  const [succeeded, rest] = partition(results, (res) => !!res.result)
  const succeededSorted = orderBy(succeeded, getClade, direction)
  return [...succeededSorted, ...rest]
}

export function sortByMutations(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalSubstitutions ?? defaultNumber(direction), direction)
}

export function sortByNonACGTNs(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalNonACGTNs ?? defaultNumber(direction), direction)
}

export function sortByMissing(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalMissing ?? defaultNumber(direction), direction)
}

export function sortByGaps(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalDeletions ?? defaultNumber(direction), direction)
}

export function sortByInsertions(results: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalInsertions ?? defaultNumber(direction), direction)
}

export function sortByFrameShifts(ress: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(ress, (res) => res.result?.qc.frameShifts?.totalFrameShifts ?? defaultNumber(direction), direction)
}

export function sortByStopCodons(ress: SequenceAnalysisState[], direction: SortDirection) {
  return orderBy(ress, (res) => res.result?.qc.stopCodons?.totalStopCodons ?? defaultNumber(direction), direction)
}

export function sortResults(results: SequenceAnalysisState[], sorting: Sorting) {
  const { category, direction } = sorting

  switch (category) {
    case SortCategory.id:
      return sortById(results, direction)

    case SortCategory.seqName:
      return sortByName(results, direction)

    case SortCategory.qcIssues:
      return sortByQcIssues(results, direction)

    case SortCategory.clade:
      return sortByClade(results, direction)

    case SortCategory.totalMutations:
      return sortByMutations(results, direction)

    case SortCategory.totalNonACGTNs:
      return sortByNonACGTNs(results, direction)

    case SortCategory.totalMissing:
      return sortByMissing(results, direction)

    case SortCategory.totalGaps:
      return sortByGaps(results, direction)

    case SortCategory.totalInsertions:
      return sortByInsertions(results, direction)

    case SortCategory.totalFrameShifts:
      return sortByFrameShifts(results, direction)

    case SortCategory.totalStopCodons:
      return sortByStopCodons(results, direction)
  }

  return results
}

export function sortResultsByKey(results: SequenceAnalysisState[], sorting: SortingKeyBased) {
  const { key, direction } = sorting
  return orderBy(results, (res) => res.result?.customNodeAttributes[key], direction)
}
