/* eslint-disable array-func/no-unnecessary-this-arg */
import { concurrent } from 'fasy'
import { omit } from 'lodash'

import { notUndefined } from 'src/helpers/notUndefined'
import { sanitizeError } from 'src/helpers/sanitizeError'
import type { AnalysisResultWithClade, AnalysisResultWithMatch, Virus } from 'src/algorithms/types'
import type { AnalyzeParams, ScheduleQcRunParams } from 'src/state/algorithm/algorithm.sagas'
import type { WorkerPools } from 'src/workers/types'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { SequenceAnalysisStateWithMatch } from 'src/state/algorithm/algorithm.state'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { assignClade } from 'src/algorithms/assignClade'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { treeFindNearestNodes } from 'src/algorithms/tree/treeFindNearestNodes'

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

  const auspiceData = treePreprocess(auspiceDataReference)

  const { threadParse, poolAnalyze, poolRunQc, threadTreeFinalize } = workers
  const { parsedSequences } = await threadParse(input)

  const states: SequenceAnalysisStateWithMatch[] = await concurrent.map(async ([seqName, seq], id) => {
    try {
      const analysisResult = await scheduleOneAnalysisRun({ poolAnalyze, seqName, seq, virus })

      const { match, privateMutations } = treeFindNearestNodes({ analysisResult, rootSeq, auspiceData })

      const { clade } = assignClade(analysisResult, match)

      const analysisResultWithClade: AnalysisResultWithClade = { ...analysisResult, clade }

      const qc = await scheduleOneQcRun({
        poolRunQc,
        analysisResult: analysisResultWithClade,
        privateMutations,
        qcRulesConfig,
      })

      const result: AnalysisResultWithMatch = { ...analysisResultWithClade, qc, match }

      return {
        seqName,
        id,
        errors: [],
        result,
        qc,
        match,
        status: AlgorithmSequenceStatus.analysisDone,
      }
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
        match: undefined,
        status: AlgorithmSequenceStatus.analysisFailed,
      }
    }
  }, Object.entries(parsedSequences))

  let auspiceDataPostprocessed
  if (shouldMakeTree) {
    const { auspiceData: auspiceDataFinal } = await threadTreeFinalize({
      auspiceData,
      results: states.map((state) => state.result).filter(notUndefined),
      rootSeq,
    })

    auspiceDataPostprocessed = treePostProcess(auspiceDataFinal)
  }

  const results = states.map((state) => omit(state, 'result.match'))

  return { results, auspiceData: auspiceDataPostprocessed }
}
