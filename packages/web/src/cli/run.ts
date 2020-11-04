import { identity, zipWith } from 'lodash'

import type { AnalysisResult, Virus } from 'src/algorithms/types'
import { formatError } from 'src/helpers/formatError'
import { notUndefined } from 'src/helpers/notUndefined'

import { safeZip } from 'src/helpers/safeZip'

import { parseSequences } from 'src/algorithms/parseSequences'
import { analyze } from 'src/algorithms/run'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treeFindNearestNodes } from 'src/algorithms/tree/treeFindNearestNodes'
import { assignClade } from 'src/algorithms/assignClade'
import { runQC } from 'src/algorithms/QC/runQC'
import { treeAttachNodes } from 'src/algorithms/tree/treeAttachNodes'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { sanitizeError } from 'src/helpers/sanitizeError'

const t = identity

export function run(input: string, virus: Virus) {
  const { rootSeq, auspiceData: auspiceDataReference, qcRulesConfig } = virus
  const parsedSequences = parseSequences(input)

  const analysisResultsWithoutClades = Object.entries(parsedSequences)
    .map(([seqName, seq], id) => {
      try {
        return analyze({ seqName, seq, virus })
      } catch (error_) {
        const error = sanitizeError(error_)
        const errorText = formatError(t, error)
        console.error(
          `Error: in sequence "${seqName}": ${errorText}. Please note that this sequence will not be included in the results.`,
        )
        return undefined
      }
    })
    .filter(notUndefined)

  const auspiceData = treePreprocess(auspiceDataReference, rootSeq)
  const { matches, privateMutationSets, auspiceData: auspiceDataRaw } = treeFindNearestNodes({
    analysisResults: analysisResultsWithoutClades,
    rootSeq,
    auspiceData,
  })

  const resultsAndMatches = safeZip(analysisResultsWithoutClades, matches)
  const clades = resultsAndMatches.map(([analysisResult, match]) => assignClade(analysisResult, match))

  const analysisResultsWithClades = safeZip(
    analysisResultsWithoutClades,
    clades,
  ).map(([analysisResult, { clade }]) => ({ ...analysisResult, clade }))

  const resultsAndDiffs = safeZip(analysisResultsWithClades, privateMutationSets)

  const qcResults = resultsAndDiffs.map(([analysisResult, privateMutations]) =>
    runQC({ analysisResult, privateMutations, qcRulesConfig }),
  )

  const results: AnalysisResult[] = zipWith(analysisResultsWithClades, qcResults, (ar, qc) => ({ ...ar, qc }))

  const { auspiceData: auspiceDataFinal } = treeAttachNodes({ auspiceData: auspiceDataRaw, results, matches, rootSeq })
  const auspiceDataPostprocessed = treePostProcess(auspiceDataFinal)

  return { results, auspiceData: auspiceDataPostprocessed }
}
