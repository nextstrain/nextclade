import { AuspiceJsonV2 } from 'auspice'
import path from 'path'
import { AnalysisResult } from 'src/algorithms/types'
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
const OUTPUT_TREE = 'output-tree' as const
const OUTPUT_OPTS = [OUTPUT_JSON, OUTPUT_CSV, OUTPUT_TSV, OUTPUT_TREE] as const

export function parseCommandLine() {
  const params = yargs(process.argv)
    .parserConfiguration({ 'camel-case-expansion': false })
    .wrap(null)
    .usage(`${PROJECT_NAME}: ${PROJECT_DESCRIPTION}\n\nUsage: $0 [options]\n       $0 completion`)
    .completion('completion', 'Generate shell autocompletion script')
    .version(pkg.version)
    .option('input-fasta', {
      alias: 'i',
      type: 'string',
      demandOption: true,
      description: 'Path to .fasta or .txt file with input sequences',
    })
    .option('input-qc-config', {
      alias: 'q',
      type: 'string',
      description: 'Path to QC config json file containing custom QC configuration',
    })
    .option('input-root-seq', {
      alias: 'r',
      type: 'string',
      description: 'Path to plain text file containing custom root sequence',
    })
    .option('input-tree', {
      alias: 'a',
      type: 'string',
      description:
        'Path to Auspice JSON v2 file containing custom reference tree. See https://nextstrain.org/docs/bioinformatics/data-formats',
    })
    .option(OUTPUT_JSON, {
      alias: 'o',
      type: 'string',
      description: 'Path to output JSON results file',
    })
    .option(OUTPUT_CSV, {
      alias: 'c',
      type: 'string',
      description: 'Path to output CSV results file',
    })
    .option(OUTPUT_TSV, {
      alias: 't',
      type: 'string',
      description: 'Path to output TSV results file',
    })
    .option(OUTPUT_TREE, {
      alias: 'T',
      type: 'string',
      description:
        'Path to output Auspice JSON V2 results file. See https://nextstrain.org/docs/bioinformatics/data-formats',
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

export type CliParams = ReturnType<typeof parseCommandLine>

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

export async function validateParams(params: CliParams) {
  const inputFasta = params['input-fasta']
  const inputQcConfig = params['input-qc-config']
  const inputRootSeq = params['input-root-seq']
  const inputTree = params['input-tree']

  const outputJson = params[OUTPUT_JSON]
  const outputCsv = params[OUTPUT_CSV]
  const outputTsv = params[OUTPUT_TSV]
  const outputTree = params[OUTPUT_TREE]

  await assertCanCreate(outputJson)
  await assertCanCreate(outputCsv)
  await assertCanCreate(outputTsv)
  await assertCanCreate(outputTree)

  return { inputFasta, inputQcConfig, inputRootSeq, inputTree, outputJson, outputCsv, outputTsv, outputTree }
}

export interface ReadInputsParams {
  inputFasta: string
  inputQcConfig?: string
  inputRootSeq?: string
  inputTree?: string
}

export async function readInputs({ inputFasta, inputQcConfig, inputRootSeq, inputTree }: ReadInputsParams) {
  const input = await fs.readFile(inputFasta, 'utf-8')

  let qcRulesConfigCustom: Record<string, unknown> = {}
  if (inputQcConfig) {
    qcRulesConfigCustom = (await fs.readJson(inputQcConfig)) as Record<string, unknown>
  }
  const qcRulesConfig: QCRulesConfig = qcRulesConfigValidate(merge(qcRulesConfigDefault, qcRulesConfigCustom))

  let rootSeq = rootSeqDefault
  if (inputRootSeq) {
    rootSeq = await fs.readFile(inputRootSeq, 'utf-8')
  }

  let auspiceDataCustom
  if (inputTree) {
    auspiceDataCustom = (await fs.readJson(inputTree)) as Record<string, unknown>
  }
  const auspiceDataReference = treeValidate(auspiceDataCustom ?? auspiceDataDefault)

  return { input, rootSeq, qcRulesConfig, auspiceDataReference }
}

export interface WriteResultsParams {
  results: AnalysisResult[]
  auspiceData: AuspiceJsonV2
  outputJson?: string
  outputCsv?: string
  outputTsv?: string
  outputTree?: string
}

export async function writeResults({
  results,
  auspiceData,
  outputJson,
  outputCsv,
  outputTsv,
  outputTree,
}: WriteResultsParams) {
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

  if (outputTree) {
    await fs.writeJson(outputTree, auspiceData, { spaces: 2 })
  }
}

export async function main() {
  const params = parseCommandLine()

  const {
    inputFasta,
    outputJson,
    outputCsv,
    outputTsv,
    outputTree,
    inputQcConfig,
    inputRootSeq,
  } = await validateParams(params)

  const { input, rootSeq, qcRulesConfig, auspiceDataReference } = await readInputs({
    inputFasta,
    inputQcConfig,
    inputRootSeq,
  })

  const { results, auspiceData } = run(input, rootSeq, qcRulesConfig, auspiceDataReference)

  await writeResults({ results, auspiceData, outputJson, outputCsv, outputTsv, outputTree })
}

main().catch((error_) => {
  const error = sanitizeError(error_)
  console.error(error)
})
