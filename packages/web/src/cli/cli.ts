import type { DeepPartial } from 'ts-essentials'
import fs from 'fs-extra'
import { merge } from 'lodash'

import { qcRulesConfigDefault, QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { qcRulesConfigValidate } from 'src/cli/qcRulesConfigValidate'

import rootSeqDefault from 'src/assets/data/defaultRootSequence.txt'
import auspiceDataDefault from 'src/assets/data/ncov_small.json'

import { run } from 'src/cli/run'

export async function main() {
  // TODO: read use-provided inputs
  const input = await fs.readFile('input.fasta', 'utf-8')

  // TODO: read use-provided root sequence
  const rootSeq = rootSeqDefault

  // TODO: read use-provided qc config
  const qcRulesConfigCustom: DeepPartial<QCRulesConfig> = {}
  const qcRulesConfig: QCRulesConfig = qcRulesConfigValidate(merge(qcRulesConfigDefault, qcRulesConfigCustom))

  // TODO: read use-provided auspice data
  const auspiceDataReference = treeValidate(auspiceDataDefault)

  const { results, auspiceData } = run(input, rootSeq, qcRulesConfig, auspiceDataReference)

  console.log(require('util').inspect({ results }, { colors: true, depth: null, maxArrayLength: null }))
}

main().catch(console.error)
