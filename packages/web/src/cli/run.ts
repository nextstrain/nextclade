/* eslint-disable array-func/no-unnecessary-this-arg */
import { concurrent } from 'fasy'
import { sortBy, zipWith } from 'lodash'

import type { Virus } from 'src/algorithms/types'
import { notUndefined } from 'src/helpers/notUndefined'
import { sanitizeError } from 'src/helpers/sanitizeError'
import type { AnalyzeParams, ScheduleQcRunParams } from 'src/state/algorithm/algorithm.sagas'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { WorkerPools } from 'src/workers/types'
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

export async function run(workers: WorkerPools, input: string, virus: Virus, shouldMakeTree: boolean) {
  const { rootSeq, auspiceData: auspiceDataReference, qcRulesConfig } = virus

  const { threadParse, poolAnalyze, threadTreeBuild, poolRunQc, threadTreeFinalize } = workers
  const { parsedSequences } = await threadParse(input)

  // Mimics the redux state in the web app
  let results: SequenceAnalysisState[] = await concurrent.map(async ([seqName, seq], id) => {
    try {
      const result = await scheduleOneAnalysisRun({ poolAnalyze, seqName, seq, virus })
      return { seqName, id, errors: [], result, qc: undefined, status: AlgorithmSequenceStatus.analysisDone }
    } catch (error_) {
      const error = sanitizeError(error_)
      console.error(
        `Error: in sequence "${seqName}": ${error.message}. This sequence will be excluded from further analysis.`,
      )
      return {
        seqName,
        id,
        errors: [error.message],
        result: undefined,
        qc: undefined,
        status: AlgorithmSequenceStatus.analysisFailed,
      }
    }
  }, Object.entries(parsedSequences))

  // Sorting is necessary because parallel execution order is not guaranteed
  results = sortBy(results, (result) => result.id)

  // From now on we only operate on results from successfully analyzed sequences.
  // However, it is important to preserve the errored sequences in the `results` array above.
  // For that, from now on we update `results` entries matching them by sequence name, without overwriting failed entries.
  const analysisResultsWithoutClades = results.map((r) => r.result).filter(notUndefined)

  // Mimics the reducer in the web app - updates `results` state
  analysisResultsWithoutClades.forEach((result) => {
    // Important to not overwrite the failed results. Only update successful ones.
    results = results.map((oldResult) => {
      if (oldResult.seqName === result.seqName) {
        return { ...oldResult, errors: [], result, status: AlgorithmSequenceStatus.analysisDone }
      }
      return oldResult
    })
  })

  const auspiceData = treePreprocess(auspiceDataReference)

  const { matches, privateMutationSets, auspiceData: auspiceDataRaw } = await threadTreeBuild({
    analysisResults: analysisResultsWithoutClades,
    rootSeq,
    auspiceData,
  })

  const resultsAndMatches = safeZip(analysisResultsWithoutClades, matches)
  const clades = resultsAndMatches.map(([analysisResult, match]) => assignClade(analysisResult, match))

  const analysisResultsWithClades = safeZip(
    analysisResultsWithoutClades,
    clades.map((r) => r.clade),
  ).map(([analysisResult, clade]) => ({ ...analysisResult, clade }))

  const resultsAndDiffs = safeZip(analysisResultsWithClades, privateMutationSets)

  const qcResults = await concurrent.map(
    async ([analysisResult, privateMutations], id) =>
      scheduleOneQcRun({ poolRunQc, analysisResult, privateMutations, qcRulesConfig }),
    resultsAndDiffs,
  )

  const analysisResults = zipWith(analysisResultsWithClades, qcResults, (ar, qc) => ({ ...ar, qc }))

  // Mimics the reducer in the web app - updates `results` state
  analysisResults.forEach((result) => {
    // Important to not overwrite the failed results. Only update successful ones.
    results = results.map((oldResult) => {
      if (oldResult.seqName === result.seqName) {
        return { ...oldResult, result, qc: result.qc, status: AlgorithmSequenceStatus.qcDone }
      }
      return oldResult
    })
  })

  let auspiceDataPostprocessed
  if (shouldMakeTree) {
    const { auspiceData: auspiceDataFinal } = await threadTreeFinalize({
      auspiceData: auspiceDataRaw,
      results: analysisResults,
      matches,
      rootSeq,
    })

    auspiceDataPostprocessed = treePostProcess(auspiceDataFinal)
  }

  return { results, auspiceData: auspiceDataPostprocessed }
}
