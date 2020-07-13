import { orderBy, partition } from 'lodash'

import { formatClades } from 'src/helpers/formatClades'
import { AnylysisStatus, SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

export enum SortCategory {
  id = 'id',
  seqName = 'seqName',
  clade = 'clade',
  qcIssues = 'qcIssues',
  totalMutations = 'totalMutations',
  totalNonACGTNs = 'totalNonACGTNs',
  totalMissing = 'totalMissing',
  totalGaps = 'totalGaps',
}

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export interface Sorting {
  category: SortCategory
  direction: SortDirection
}

export function defaultNumber(direction: SortDirection) {
  return direction === SortDirection.asc ? Infinity : 0
}

export function getClade(res: SequenceAnylysisState) {
  const clades = res.result?.clades
  if (!clades) {
    return '-'
  }

  const { cladeStr } = formatClades(clades)
  return cladeStr
}

export function sortById(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.id, direction)
}

export function sortByName(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.seqName, direction)
}

export function sortByQcIssues(results: SequenceAnylysisState[], direction: SortDirection) {
  // Only sort sequences that are ready (succeeded or failed). Put sequences still being analyzed sequences at the bottom.
  const [ready, rest] = partition(
    results,
    (res) => res.status === AnylysisStatus.done || res.status === AnylysisStatus.failed,
  )

  const readySorted = orderBy(
    ready,
    (res) => {
      // Sort errored sequences as having very bad QC results
      const errorScore = res.errors.length * 10e3
      const qcScore = res.result?.diagnostics.flags.length ?? defaultNumber(direction)
      return errorScore + qcScore
    },
    direction,
  )

  return [...readySorted, ...rest]
}

export function sortByClade(results: SequenceAnylysisState[], direction: SortDirection) {
  // Only sort sequences that are succeeded. Put errored sequences and sequences still being analyzed at the bottom.
  const [succeeded, rest] = partition(results, (res) => !!res.result)
  const succeededSorted = orderBy(succeeded, getClade, direction)
  return [...succeededSorted, ...rest]
}

export function sortByMutations(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalMutations ?? defaultNumber(direction), direction)
}

export function sortByNonACGTNs(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalNonACGTNs ?? defaultNumber(direction), direction)
}

export function sortByMissing(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalMissing ?? defaultNumber(direction), direction)
}

export function sortByGaps(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, (res) => res.result?.totalGaps ?? defaultNumber(direction), direction)
}

export function resultsSort(results: SequenceAnylysisState[], sorting: Sorting) {
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
  }

  return results
}
