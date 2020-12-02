/* eslint-disable promise/always-return,unicorn/no-process-exit */
import os from 'os'
import path from 'path'
import fs, { readFile } from 'fs-extra'
import { AuspiceJsonV2 } from 'auspice'
import yargs from 'yargs'

import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { Virus } from 'src/algorithms/types'
import { createWorkerPools } from 'src/workers/createWorkerPools'
import { getVirus } from 'src/algorithms/defaults/viruses'
import { convertGeneMap } from 'src/io/convertGeneMap'
import { parseCsv } from 'src/io/parseCsv'
import { parseRootSeq } from 'src/io/parseRootSeq'
import { validateGeneMap } from 'src/io/validateGeneMap'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { PROJECT_NAME, PROJECT_DESCRIPTION } from 'src/constants'
import { prepareResultsJson, serializeResultsToCsv } from 'src/io/serializeResults'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { qcRulesConfigValidate } from 'src/algorithms/QC/qcRulesConfigValidate'
import { convertPcrPrimers } from 'src/algorithms/primers/convertPcrPrimers'
import { validatePcrPrimerEntries, validatePcrPrimers } from 'src/algorithms/primers/validatePcrPrimers'
import { run } from 'src/cli/run'

import pkg from 'src/../package.json'

const OUTPUT_JSON = 'output-json' as const
const OUTPUT_CSV = 'output-csv' as const
const OUTPUT_TSV_CLADES_ONLY = 'output-tsv-clades-only' as const
const OUTPUT_TSV = 'output-tsv' as const
const OUTPUT_TREE = 'output-tree' as const
const OUTPUT_OPTS = [OUTPUT_JSON, OUTPUT_CSV, OUTPUT_TSV_CLADES_ONLY, OUTPUT_TSV, OUTPUT_TREE] as const

const NUM_CPUS = os.cpus().length

export function parseCommandLine() {
  const params = yargs(process.argv)
    .parserConfiguration({ 'camel-case-expansion': false })
    .wrap(null)
    .usage(`${PROJECT_NAME}: ${PROJECT_DESCRIPTION}\n\nUsage: $0 [options]\n       $0 completion`)
    .completion('completion', 'Generate shell autocompletion script')
    .version(pkg.version)
    .option('jobs', {
      alias: 'j',
      type: 'number',
      default: NUM_CPUS,
      description:
        'Number of CPU threads used by the algorithm. If not specified, using number of logical CPU cores, as detected by Node.js runtime',
    })
    .option('input-fasta', {
      alias: 'i',
      type: 'string',
      demandOption: true,
      description: 'Path to a .fasta or a .txt file with input sequences',
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
        '(optional) Path to Auspice JSON v2 file containing custom reference tree. See https://nextstrain.org/docs/bioinformatics/data-formats',
    })
    .option('input-qc-config', {
      alias: 'q',
      type: 'string',
      description:
        '(optional) Path to a JSON file containing custom configuration of Quality Control rules.\nFor an example format see: https://github.com/nextstrain/nextclade/blob/20a9fda5b8046ce26669de2023770790c650daae/packages/web/src/algorithms/defaults/sars-cov-2/qcRulesConfig.ts',
    })
    .option('input-gene-map', {
      alias: 'g',
      type: 'string',
      description:
        '(optional) Path to a JSON file containing custom gene map. Gene map (sometimes also called "gene annotations") is used to resolve aminoacid changes in genes.\nFor an example see https://github.com/nextstrain/nextclade/blob/20a9fda5b8046ce26669de2023770790c650daae/packages/web/src/algorithms/defaults/sars-cov-2/geneMap.json',
    })
    .option('input-pcr-primers', {
      alias: 'p',
      type: 'string',
      description:
        '(optional) Path to a CSV file containing a list of custom PCR primer sites. These are used to report mutations in these sites.\nFor an example see https://github.com/nextstrain/nextclade/blob/20a9fda5b8046ce26669de2023770790c650daae/packages/web/src/algorithms/defaults/sars-cov-2/pcrPrimers.csv',
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
    .option(OUTPUT_TSV_CLADES_ONLY, {
      type: 'string',
      description: 'Path to output CSV clades-only file',
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
  const numThreads = params.jobs
  const inputFasta = params['input-fasta']
  const inputRootSeq = params['input-root-seq']
  const inputTree = params['input-tree']
  const inputQcConfig = params['input-qc-config']
  const inputGeneMap = params['input-gene-map']
  const inputPcrPrimers = params['input-pcr-primers']
  const outputJson = params[OUTPUT_JSON]
  const outputCsv = params[OUTPUT_CSV]
  const outputTsvCladesOnly = params[OUTPUT_TSV_CLADES_ONLY]
  const outputTsv = params[OUTPUT_TSV]
  const outputTree = params[OUTPUT_TREE]

  await assertCanCreate(outputJson)
  await assertCanCreate(outputCsv)
  await assertCanCreate(outputTsvCladesOnly)
  await assertCanCreate(outputTsv)
  await assertCanCreate(outputTree)

  return {
    numThreads,
    inputFasta,
    inputRootSeq,
    inputTree,
    inputQcConfig,
    inputGeneMap,
    inputPcrPrimers,
    outputJson,
    outputCsv,
    outputTsvCladesOnly,
    outputTsv,
    outputTree,
  }
}

export interface ReadInputsParams {
  inputFasta: string
  inputRootSeq?: string
  inputTree?: string
  inputQcConfig?: string
  inputGeneMap?: string
  inputPcrPrimers?: string
  virusDefaults: Virus
}

export async function readInputs({
  inputFasta,
  inputRootSeq,
  inputTree,
  inputQcConfig,
  inputGeneMap,
  inputPcrPrimers,
  virusDefaults,
}: ReadInputsParams) {
  const input = await fs.readFile(inputFasta, { encoding: 'utf-8' })

  let virus: Virus = virusDefaults

  if (inputRootSeq) {
    const rootSeq = parseRootSeq(await fs.readFile(inputRootSeq, { encoding: 'utf-8' }))
    if (rootSeq) {
      virus = { ...virus, rootSeq }
    }
  }

  if (inputTree) {
    const auspiceData = treeValidate(await fs.readJson(inputTree))
    if (auspiceData) {
      virus = { ...virus, auspiceData }
    }
  }

  if (inputQcConfig) {
    const qcRulesConfig = qcRulesConfigValidate(await fs.readJson(inputQcConfig))
    virus = { ...virus, qcRulesConfig }
  }

  if (inputGeneMap) {
    const geneMap = validateGeneMap(convertGeneMap(await fs.readJson(inputGeneMap)))
    virus = { ...virus, geneMap }
  }

  if (inputPcrPrimers) {
    const content = await readFile(inputPcrPrimers, { encoding: 'utf-8' })
    const primerEntries = validatePcrPrimerEntries(parseCsv(content))
    const pcrPrimers = validatePcrPrimers(convertPcrPrimers(primerEntries, virus.rootSeq))
    virus = { ...virus, pcrPrimers }
  }

  return { input, virus }
}

export interface WriteResultsParams {
  results: SequenceAnalysisState[]
  auspiceData?: AuspiceJsonV2
  outputJson?: string
  outputCsv?: string
  outputTsvCladesOnly?: string
  outputTsv?: string
  outputTree?: string
}

export async function writeResults({
  results,
  auspiceData,
  outputJson,
  outputCsv,
  outputTsvCladesOnly,
  outputTsv,
  outputTree,
}: WriteResultsParams) {
  const json = prepareResultsJson(results)
  if (outputJson) {
    await fs.writeJson(outputJson, json, { spaces: 2 })
  }

  if (outputCsv) {
    const csv = await serializeResultsToCsv(results, ';')
    await fs.writeFile(outputCsv, csv)
  }

  if (outputTsv) {
    const tsv = await serializeResultsToCsv(results, '\t')
    await fs.writeFile(outputTsv, tsv)
  }

  if (outputTree && auspiceData) {
    await fs.writeJson(outputTree, auspiceData, { spaces: 2 })
  }
}

export async function main() {
  const params = parseCommandLine()

  const {
    numThreads,
    inputFasta,
    inputRootSeq,
    inputTree,
    inputQcConfig,
    inputGeneMap,
    inputPcrPrimers,
    outputJson,
    outputCsv,
    outputTsvCladesOnly,
    outputTsv,
    outputTree,
  } = await validateParams(params)

  const virusDefaults = getVirus(/* TODO: virusName */)
  const shouldMakeTree = outputTree !== undefined

  const { input, virus } = await readInputs({
    inputFasta,
    inputRootSeq,
    inputTree,
    inputQcConfig,
    inputGeneMap,
    inputPcrPrimers,
    virusDefaults,
  })

  const workers = await createWorkerPools({ numThreads })

  const { results, auspiceData } = await run(workers, input, virus, shouldMakeTree)

  await workers.poolAnalyze.terminate()
  await workers.poolRunQc.terminate()

  await writeResults({ results, auspiceData, outputJson, outputCsv, outputTsvCladesOnly, outputTsv, outputTree })
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error_) => {
    const error = sanitizeError(error_)
    console.error(error)
  })
