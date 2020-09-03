import fs from 'fs-extra'
import { merge, zipWith } from 'lodash'
import type { DeepPartial } from 'ts-essentials'
import type { AuspiceJsonV2 } from 'auspice'

import { safeZip } from 'src/helpers/safeZip'
import type { AnalysisResult } from 'src/algorithms/types'
import { qcRulesConfigDefault, QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'
import { parseSequences } from 'src/algorithms/parseSequences'
import { analyze } from 'src/algorithms/run'
import { runQC } from 'src/algorithms/QC/runQC'
import { treeFindNearestNodes } from 'src/algorithms/tree/treeFindNearestNodes'
import { treeAttachNodes } from 'src/algorithms/tree/treeAttachNodes'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { assignClade } from 'src/algorithms/assignClade'

import rootSeqDefault from 'src/assets/data/defaultRootSequence.txt'
import auspiceDataDefault from 'src/assets/data/ncov_small.json'

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

export async function main() {
  // TODO: read use-provided inputs
  const input = await fs.readFile('input.fasta', 'utf-8')

  // TODO: read use-provided root sequence
  const rootSeq = rootSeqDefault

  // TODO: read use-provided qc config
  const qcRulesConfigCustom: DeepPartial<QCRulesConfig> = {}
  const qcRulesConfig: QCRulesConfig = merge(qcRulesConfigDefault, qcRulesConfigCustom)

  // TODO: read use-provided auspice data
  const auspiceDataReference = treeValidate(auspiceDataDefault)

  const { results, auspiceData } = run(input, rootSeq, qcRulesConfig, auspiceDataReference)

  console.log(require('util').inspect({ results }, { colors: true, depth: null, maxArrayLength: null }))
}

main().catch(console.error)
