import neodoc from 'neodoc'
import { readFile, readJson, writeJson } from 'fs-extra'

import { nextstrainTreeFetch } from '../src/io/nextstrainTreeFetch'
import { locateInTree, SequenceAnalysisDatum } from '../src/algorithms/tree/locateInTree'

const CLI_DOC = `
Usage:
  locateInTree.ts <input.json> <output.json>
  locateInTree.ts --tree=<input_tree.json> <input.json> <output.json>
`

const ROOT_SEQ_PATH = 'src/assets/data/defaultRootSequence.txt'

function parseArgs() {
  const args = neodoc.run(CLI_DOC)
  const inputTreeJsonPath = args['--tree']
  const inputPath = args['<input.json>']
  const outputPath = args['<output.json>']
  return { inputPath, inputTreeJsonPath, outputPath }
}

async function main() {
  const { inputPath, inputTreeJsonPath, outputPath } = parseArgs()

  if (!inputPath) {
    throw new Error('Input file path expected')
  }

  if (!outputPath) {
    throw new Error('Output file path expected as a last argument')
  }

  let treeRaw: Record<string, unknown>
  if (inputTreeJsonPath) {
    treeRaw = (await readJson(inputTreeJsonPath)) as Record<string, unknown>
  } else {
    treeRaw = await nextstrainTreeFetch()
  }

  const rootSeq = (await readFile(ROOT_SEQ_PATH)).toString()
  const data = (await readJson(inputPath)) as SequenceAnalysisDatum[]

  const result = locateInTree(data, treeRaw, rootSeq)
  await writeJson(outputPath, result, { spaces: 2 })
}

main().catch(console.error)
