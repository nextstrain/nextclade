import { zipWith } from 'lodash'
import type { AuspiceJsonV2 } from 'auspice'

import type { QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'
import type { AnalysisResult } from 'src/algorithms/types'

import { safeZip } from 'src/helpers/safeZip'

import { parseSequences } from 'src/algorithms/parseSequences'
import { analyze } from 'src/algorithms/run'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treeFindNearestNodes } from 'src/algorithms/tree/treeFindNearestNodes'
import { assignClade } from 'src/algorithms/assignClade'
import { runQC } from 'src/algorithms/QC/runQC'
import { treeAttachNodes } from 'src/algorithms/tree/treeAttachNodes'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'

export function run(input: string, rootSeq: string, qcRulesConfig: QCRulesConfig, auspiceDataReference: AuspiceJsonV2) {
  const parsedSequences = parseSequences(input)

  const analysisResultsWithoutClades = Object.entries(parsedSequences).map(([seqName, seq]) => {
    return analyze({ seqName, seq, rootSeq })
  })

  const auspiceData = treePreprocess(auspiceDataReference)
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
