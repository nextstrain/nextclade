import { unparse } from 'papaparse'

import { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { formatClades } from 'src/helpers/formatClades'
import { formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatInsertion } from 'src/helpers/formatInsertion'
import { locateInTree } from 'src/algorithms/tree/locateInTree'
import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'

import auspiceTree from 'src/assets/data/ncov_small.json'

export function prepareResultsJson(results: SequenceAnylysisState[]) {
  return results.map(({ seqName, status, errors, result }) => {
    if (!result) {
      return { seqName, errors }
    }

    const {
      alignmentScore,
      alignmentStart,
      alignmentEnd,
      aminoacidChanges,
      clades,
      deletions,
      diagnostics,
      insertions,
      missing,
      nonACGTNs,
      substitutions,
      totalAminoacidChanges,
      totalGaps,
      totalInsertions,
      totalMissing,
      totalMutations,
      totalNonACGTNs,
    } = result

    const { cladeStr: clade } = formatClades(clades)

    return {
      seqName,
      clade,
      alignmentStart,
      alignmentEnd,
      alignmentScore,
      mutations: substitutions,
      totalMutations,
      aminoacidChanges,
      totalAminoacidChanges,
      deletions,
      totalGaps,
      insertions,
      totalInsertions,
      missing,
      totalMissing,
      nonACGTNs,
      totalNonACGTNs,
      QCStatus: diagnostics.flags.length > 0 ? 'Fail' : 'Pass',
      QCFlags: diagnostics.flags,
    }
  })
}

export function serializeResultsToJson(results: SequenceAnylysisState[]) {
  const data = prepareResultsJson(results)
  return JSON.stringify(data, null, 2)
}

export function serializeResultsToAuspiceJsonV2(results: SequenceAnylysisState[]) {
  const data = prepareResultsJson(results)
  const auspiceData = locateInTree(data, auspiceTree, DEFAULT_ROOT_SEQUENCE)
  return JSON.stringify(auspiceData, null, 2)
}

export function serializeResultsToCsv(results: SequenceAnylysisState[]) {
  const data = results.map(({ seqName, status, errors, result }) => {
    if (!result) {
      return { seqName, errors: errors.map((e) => `"${e}"`).join(',') }
    }

    const {
      // alignmentScore,
      alignmentStart,
      alignmentEnd,
      // aminoacidChanges,
      clades,
      deletions,
      diagnostics,
      insertions,
      missing,
      // nonACGTNs,
      substitutions,
      // totalAminoacidChanges,
      totalGaps,
      totalInsertions,
      totalMissing,
      totalMutations,
      totalNonACGTNs,
    } = result

    const { cladeStr: clade } = formatClades(clades)

    return {
      seqName,
      clade,
      alignmentStart,
      alignmentEnd,
      mutations: substitutions.map((mut) => formatMutation(mut)).join(','),
      totalMutations,
      deletions: deletions.map(({ start, length }) => formatRange(start, start + length)).join(','),
      totalGaps,
      insertions: insertions.map((ins) => formatInsertion(ins)).join(','),
      totalInsertions,
      missing: missing.map(({ begin, end }) => formatRange(begin, end)).join(','),
      totalMissing,
      totalNonACGTNs,
      QCStatus: diagnostics.flags.length > 0 ? 'Fail' : 'Pass',
      QCFlags: diagnostics.flags.join(','),
      errors: [],
    }
  })

  return unparse(data, { delimiter: ';', header: true, newline: '\r\n', quotes: false })
}
