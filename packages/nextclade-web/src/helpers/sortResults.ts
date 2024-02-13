import { get, isNil, orderBy, partition } from 'lodash'
import type { NextcladeResult } from 'src/types'

export enum SortCategory {
  index = 'index',
  seqName = 'seqName',
  clade = 'clade',
  qcIssues = 'qcIssues',
  coverage = 'coverage',
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

export function defaultNumber(direction: SortDirection) {
  return direction === SortDirection.asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
}

export function getClade(result: NextcladeResult) {
  return result.result?.analysisResult.clade ?? '-'
}

export function sortById(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(results, (result) => result.index, direction)
}

export function sortByName(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(results, (result) => result.seqName, direction)
}

export function sortByQcIssues(results: NextcladeResult[], direction: SortDirection) {
  // Only sort sequences that are ready (succeeded or failed). Put sequences still being analyzed sequences at the bottom.
  const [ready, rest] = partition(results, (result) => !isNil(result.result) || !isNil(result.error))

  const readySorted = orderBy(
    ready,
    (result) => {
      // Sort errored sequences as having very bad QC results
      const errorScore = isNil(result.error) ? 0 : 1e9
      const qcScore = result.result?.analysisResult.qc?.overallScore ?? defaultNumber(direction)
      return errorScore + qcScore
    },
    direction,
  )

  return [...readySorted, ...rest]
}

export function sortByClade(results: NextcladeResult[], direction: SortDirection) {
  // Only sort sequences that are succeeded. Put errored sequences and sequences still being analyzed at the bottom.
  const [succeeded, rest] = partition(results, (result) => !!result.result)
  const succeededSorted = orderBy(succeeded, getClade, direction)
  return [...succeededSorted, ...rest]
}

export function sortByCoverage(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(results, (result) => result.result?.analysisResult.coverage ?? defaultNumber(direction), direction)
}

export function sortByMutations(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(
    results,
    (result) => result.result?.analysisResult.totalSubstitutions ?? defaultNumber(direction),
    direction,
  )
}

export function sortByNonACGTNs(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(
    results,
    (result) => result.result?.analysisResult.totalNonACGTNs ?? defaultNumber(direction),
    direction,
  )
}

export function sortByMissing(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(results, (result) => result.result?.analysisResult.totalMissing ?? defaultNumber(direction), direction)
}

export function sortByGaps(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(
    results,
    (result) => result.result?.analysisResult.totalDeletions ?? defaultNumber(direction),
    direction,
  )
}

export function sortByInsertions(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(
    results,
    (result) => result.result?.analysisResult.totalInsertions ?? defaultNumber(direction),
    direction,
  )
}

export function sortByFrameShifts(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(
    results,
    (result) => {
      const frameShifts = result.result?.analysisResult.qc.frameShifts
      if (!frameShifts) {
        return defaultNumber(direction)
      }
      return frameShifts.totalFrameShifts * 1e3 + frameShifts.totalFrameShiftsIgnored
    },
    direction,
  )
}

export function sortByStopCodons(results: NextcladeResult[], direction: SortDirection) {
  return orderBy(
    results,
    (result) => {
      const stopCodons = result.result?.analysisResult.qc.stopCodons
      if (!stopCodons) {
        return defaultNumber(direction)
      }
      return stopCodons.totalStopCodons * 1e3 + stopCodons.totalStopCodonsIgnored
    },
    direction,
  )
}

export function sortResults(results: NextcladeResult[], sorting: Sorting) {
  const { category, direction } = sorting

  switch (category) {
    case SortCategory.index:
      return sortById(results, direction)

    case SortCategory.seqName:
      return sortByName(results, direction)

    case SortCategory.qcIssues:
      return sortByQcIssues(results, direction)

    case SortCategory.clade:
      return sortByClade(results, direction)

    case SortCategory.coverage:
      return sortByCoverage(results, direction)

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

export interface SortingKeyBased {
  key: string
  direction: SortDirection
}

export function sortCustomNodeAttribute(results: NextcladeResult[], sorting: SortingKeyBased) {
  const { key, direction } = sorting
  return orderBy(
    results,
    (result) => {
      // Replace nullish values with empty strings, such that they could be sorted lexicographically
      return get(result.result?.analysisResult?.customNodeAttributes, key) ?? ''
    },
    direction,
  )
}

export function sortPhenotypeValue(results: NextcladeResult[], sorting: SortingKeyBased) {
  const { key, direction } = sorting
  return orderBy(
    results,
    (result) => {
      return (
        result.result?.analysisResult?.phenotypeValues?.find((ph) => ph.name === key)?.value ?? defaultNumber(direction)
      )
    },
    direction,
  )
}

export function sortMotifs(results: NextcladeResult[], sorting: SortingKeyBased) {
  const { key, direction } = sorting
  return orderBy(
    results,
    (result) => get(result.result?.analysisResult?.aaMotifs, key)?.length ?? defaultNumber(direction),
    direction,
  )
}
