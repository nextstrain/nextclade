import Papa from 'papaparse'

import type { AnalysisResult } from 'src/algorithms/types'
import { formatClades } from 'src/helpers/formatClades'
import { formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatInsertion } from 'src/helpers/formatInsertion'

export function serializeResults(results: AnalysisResult[]) {
  const data = results.map(
    ({
      seqName,
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
    }) => {
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
      }
    },
  )

  return Papa.unparse(data, {
    delimiter: ';',
    header: true,
    newline: '\r\n',
  })
}
