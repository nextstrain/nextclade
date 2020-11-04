/* eslint-disable array-func/no-unnecessary-this-arg */
import { concurrent } from 'fasy'
import { unset } from 'lodash'

import { notUndefined } from 'src/helpers/notUndefined'
import { sanitizeError } from 'src/helpers/sanitizeError'
import type { Virus } from 'src/algorithms/types'
import type { WorkerPools } from 'src/workers/types'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { SequenceAnalysisStateWithMatch } from 'src/state/algorithm/algorithm.state'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'

export async function run(workers: WorkerPools, input: string, virus: Virus, shouldMakeTree: boolean) {
  const { rootSeq, minimalLength, pcrPrimers, geneMap, auspiceData: auspiceDataReference, qcRulesConfig } = virus
  const auspiceData = treePreprocess(auspiceDataReference, rootSeq)

  const { threadParse, poolAnalyze, threadTreeFinalize } = workers
  const { parsedSequences } = await threadParse(input)

  const states: SequenceAnalysisStateWithMatch[] = await concurrent.map(async ([seqName, seq], id) => {
    try {
      const result = await poolAnalyze.queue(async (analyze: AnalyzeThread) =>
        analyze({
          seqName,
          seq,
          rootSeq,
          minimalLength,
          pcrPrimers,
          geneMap,
          auspiceData,
          qcRulesConfig,
        }),
      )

      return {
        seqName,
        id,
        errors: [],
        result,
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
        status: AlgorithmSequenceStatus.analysisFailed,
      }
    }
  }, Object.entries(parsedSequences))

  let auspiceDataPostprocessed
  if (shouldMakeTree) {
    const results = states.map((state) => state.result).filter(notUndefined)
    const auspiceDataFinal = await threadTreeFinalize({ auspiceData, results, rootSeq })
    auspiceDataPostprocessed = treePostProcess(auspiceDataFinal)
  }

  states.forEach((state) => {
    unset(state.result, 'nearestTreeNodeId')
  })

  return { results: states, auspiceData: auspiceDataPostprocessed }
}
