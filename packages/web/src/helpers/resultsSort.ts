import { orderBy } from 'lodash'

import { formatClades } from 'src/helpers/formatClades'
import { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

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
  return direction === SortDirection.asc ? Infinity : -Infinity
}

export function getClade(res: SequenceAnylysisState) {
  if (!res.result) {
    return '-'
  }

  const clades = res.result?.clades

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
  return orderBy(results, (res) => res.result?.diagnostics.flags.length ?? defaultNumber(direction), direction)
}

export function sortByClade(results: SequenceAnylysisState[], direction: SortDirection) {
  return orderBy(results, getClade, direction)
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
