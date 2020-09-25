import { readFile, writeJson } from 'fs-extra'
import path from 'path'

import { findModuleRoot } from '../../lib/findModuleRoot'
import type { PrimerEntries } from '../../src/algorithms/primers/convertPcrPrimers'
import { convertPcrPrimers } from '../../src/algorithms/primers/convertPcrPrimers'
import { parseCsv } from '../../src/io/parseCsv'
import { parseRootSeq } from '../../src/io/parseRootSeq'

const { moduleRoot } = findModuleRoot()

const INPUT_ROOT_SEQUENCE_TXT = path.join(moduleRoot, 'src/algorithms/defaults/sars-cov-2/rootSeq.txt')
const INPUT_PRIMERS_CSV = path.join(moduleRoot, 'src/algorithms/defaults/sars-cov-2/pcrPrimers.csv')
const OUTPUT_PRIMERS_JSON = path.join(moduleRoot, 'src/algorithms/defaults/sars-cov-2/pcrPrimers.json')

export async function readCsv(filename: string) {
  const content = await readFile(filename, { encoding: 'utf-8' })
  return parseCsv(content)
}

export async function readRootSeq(filename: string) {
  const content = await readFile(filename, { encoding: 'utf-8' })
  return parseRootSeq(content)
}

export async function main() {
  const primerEntries = ((await readCsv(INPUT_PRIMERS_CSV)) as unknown) as PrimerEntries[]
  const rootSeq = await readRootSeq(INPUT_ROOT_SEQUENCE_TXT)
  const results = convertPcrPrimers(primerEntries, rootSeq)
  await writeJson(OUTPUT_PRIMERS_JSON, results, { spaces: 2, encoding: 'utf-8', EOL: '\n' })
}

main().catch(console.error)
