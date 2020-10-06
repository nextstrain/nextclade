/* eslint-disable array-func/no-unnecessary-this-arg */
import { concurrent } from 'fasy'
import { zipWith } from 'lodash'

import type { Virus } from 'src/algorithms/types'
import type { AnalyzeParams, ScheduleQcRunParams } from 'src/state/algorithm/algorithm.sagas'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { WorkerPools } from 'src/workers/types'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { assignClade } from 'src/algorithms/assignClade'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { safeZip } from 'src/helpers/safeZip'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'

export async function scheduleOneAnalysisRun({ poolAnalyze, seqName, seq, virus }: AnalyzeParams) {
  return poolAnalyze.queue(async (analyze: AnalyzeThread) => analyze({ seqName, seq, virus }))
}

export async function scheduleOneQcRun({
  poolRunQc,
  analysisResult,
  privateMutations,
  qcRulesConfig,
}: ScheduleQcRunParams) {
  return poolRunQc.queue(async (runQc: RunQcThread) => runQc({ analysisResult, privateMutations, qcRulesConfig }))
}

export async function run(workers: WorkerPools, input: string, virus: Virus) {
  const { rootSeq, auspiceData: auspiceDataReference, qcRulesConfig } = virus

  const { threadParse, poolAnalyze, threadTreeBuild, poolRunQc, threadTreeFinalize } = workers
  const { parsedSequences } = await threadParse(input)

  // Mimics the redux state in the web app
  let results: SequenceAnalysisState[] = Object.keys(parsedSequences).map((seqName, id) => {
    return {
      seqName,
      id,
      status: AlgorithmSequenceStatus.analysisStarted,
      result: undefined,
      qc: undefined,
      errors: [],
    }
  })

  const analysisResultsWithoutClades = await concurrent.map(
    async ([seqName, seq], id) => ({
      seqName,
      result: await scheduleOneAnalysisRun({ poolAnalyze, seqName, seq, virus }),
    }),
    Object.entries(parsedSequences),
  )

  // Mimics the reducer invocation in the web app - updates state
  analysisResultsWithoutClades.forEach(({ seqName, result }) => {
    results = results.map((oldResult) => {
      if (oldResult.seqName === seqName) {
        return { ...oldResult, errors: [], result, status: AlgorithmSequenceStatus.analysisDone }
      }
      return oldResult
    })
  })

  const auspiceData = treePreprocess(auspiceDataReference)
  const { matches, privateMutationSets, auspiceData: auspiceDataRaw } = await threadTreeBuild({
    analysisResults: analysisResultsWithoutClades.map((r) => r.result),
    rootSeq,
    auspiceData,
  })

  const resultsAndMatches = safeZip(
    analysisResultsWithoutClades.map((r) => r.result),
    matches,
  )
  const clades = resultsAndMatches.map(([analysisResult, match]) => assignClade(analysisResult, match))

  const analysisResultsWithClades = safeZip(
    analysisResultsWithoutClades.map((r) => r.result),
    clades.map((r) => r.clade),
  ).map(([analysisResult, clade]) => ({ ...analysisResult, clade }))

  const resultsAndDiffs = safeZip(analysisResultsWithClades, privateMutationSets)

  const qcResults = await concurrent.map(
    async ([analysisResult, privateMutations], id) =>
      scheduleOneQcRun({ poolRunQc, analysisResult, privateMutations, qcRulesConfig }),
    resultsAndDiffs,
  )

  const analysisResults = zipWith(analysisResultsWithClades, qcResults, (ar, qc) => ({ ...ar, qc }))

  // Mimics the reducer invocation in the web app - updates state
  analysisResults.forEach((result) => {
    results = results.map((oldResult) => {
      if (oldResult.seqName === result.seqName) {
        return { ...oldResult, errors: [], result, qc: result.qc, status: AlgorithmSequenceStatus.qcDone }
      }
      return oldResult
    })
  })

  const { auspiceData: auspiceDataFinal } = await threadTreeFinalize({
    auspiceData: auspiceDataRaw,
    results: analysisResults,
    matches,
    rootSeq,
  })

  const auspiceDataPostprocessed = treePostProcess(auspiceDataFinal)

  return { results, auspiceData: auspiceDataPostprocessed }
}
