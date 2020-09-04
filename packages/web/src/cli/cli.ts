import path from 'path'
import type { DeepPartial } from 'ts-essentials'
import fs from 'fs-extra'
import { merge } from 'lodash'
import yargs from 'yargs'

import { PROJECT_NAME, PROJECT_DESCRIPTION } from 'src/constants'
import { prepareResultCsv, prepareResultJson, toCsvString } from 'src/io/serializeResults'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { qcRulesConfigDefault, QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { qcRulesConfigValidate } from 'src/cli/qcRulesConfigValidate'

import rootSeqDefault from 'src/assets/data/defaultRootSequence.txt'
import auspiceDataDefault from 'src/assets/data/ncov_small.json'

import { run } from 'src/cli/run'

import pkg from 'src/../package.json'

const OUTPUT_JSON = 'output-json' as const
const OUTPUT_CSV = 'output-csv' as const
const OUTPUT_TSV = 'output-tsv' as const
const OUTPUT_OPTS = [OUTPUT_JSON, OUTPUT_CSV, OUTPUT_TSV] as const

export function parseCommandLine() {
  const params = yargs(process.argv)
    .parserConfiguration({ 'camel-case-expansion': false })
    .wrap(null)
    // .strict()
    .usage(`${PROJECT_NAME}: ${PROJECT_DESCRIPTION}\n\nUsage: $0 [options]\n       $0 completion`)
    .completion('completion', 'Generate shell autocompletion script')
    .version(pkg.version)
    .option('input-fasta', {
      alias: 'i',
      type: 'string',
      demandOption: true,
      description: 'path to .fasta or .txt file with input sequences',
    })
    .option(OUTPUT_JSON, {
      alias: 'o',
      type: 'string',
      demandOption: false,
      description: 'path to output JSON file with results',
    })
    .option(OUTPUT_CSV, {
      alias: 'c',
      type: 'string',
      demandOption: false,
      description: 'path to output CSV file with results',
    })
    .option(OUTPUT_TSV, {
      alias: 't',
      type: 'string',
      demandOption: false,
      description: 'path to output CSV file with results',
    })
    .check((argv) => {
      if (!OUTPUT_OPTS.some((opt) => argv[opt])) {
        const opts = OUTPUT_OPTS.map((opt) => `--${opt}`).join(', ')
        throw new Error(`Error: at least one of output path arguments required: ${opts}`)
      }
      return true
    })

  return params.argv
}

export async function isDir(pathlike: string) {
  const stat = await fs.lstat(pathlike)
  return stat.isDirectory() || stat.isSymbolicLink()
}

export async function assertIsDir(pathlike: string) {
  if (!(await isDir(pathlike))) {
    throw new Error(`Error: the output path ${pathlike} is not writable`)
  }
}

export async function assertCanCreate(pathlike?: string) {
  if (pathlike) {
    await assertIsDir(path.dirname(pathlike))
  }
  return undefined
}

export interface WriteResultsParams {
  results: AnalysisResult[]
  outputJson?: string
  outputCsv?: string
  outputTsv?: string
}

export async function writeResults({ results, outputJson, outputCsv, outputTsv }: WriteResultsParams) {
  const json = results.map(prepareResultJson)
  if (outputJson) {
    await fs.writeJson(outputJson, json, { spaces: 2 })
  }

  if (outputCsv) {
    const data = results.map(prepareResultCsv)
    const csv = await toCsvString(data, ';')
    await fs.writeFile(outputCsv, csv)
  }

  if (outputTsv) {
    const data = results.map(prepareResultCsv)
    const tsv = await toCsvString(data, '\t')
    await fs.writeFile(outputTsv, tsv)
  }
}

export async function main() {
  const params = parseCommandLine()

  const inputFasta = params['input-fasta']

  const outputJson = params[OUTPUT_JSON]
  const outputCsv = params[OUTPUT_CSV]
  const outputTsv = params[OUTPUT_TSV]

  await assertCanCreate(outputJson)
  await assertCanCreate(outputCsv)
  await assertCanCreate(outputTsv)

  const input = await fs.readFile(inputFasta, 'utf-8')

  // TODO: read use-provided root sequence
  const rootSeq = rootSeqDefault

  // TODO: read use-provided qc config
  const qcRulesConfigCustom: DeepPartial<QCRulesConfig> = {}
  const qcRulesConfig: QCRulesConfig = qcRulesConfigValidate(merge(qcRulesConfigDefault, qcRulesConfigCustom))

  // TODO: read use-provided auspice data
  const auspiceDataReference = treeValidate(auspiceDataDefault)

  const { results } = run(input, rootSeq, qcRulesConfig, auspiceDataReference)

  await writeResults({ results, outputJson, outputCsv, outputTsv })
}

main().catch((error_) => {
  const error = sanitizeError(error_)
  console.error(error)
})
