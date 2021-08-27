import 'regenerator-runtime'

import { expose } from 'threads/worker'

import type { SequenceParserResult } from 'src/algorithms/types'
import { loadWasmModule, runWasmModule, WasmModule } from 'src/workers/wasmModule'

export interface ParseRefSequenceWasmModule extends WasmModule {
  parseRefSequence(fastaStr: string, refFastaName: string): SequenceParserResult
}

export async function parseRefSequence(refFastaStr: string, refFastaName: string) {
  const module = await loadWasmModule<ParseRefSequenceWasmModule>('nextclade_wasm')
  return runWasmModule<ParseRefSequenceWasmModule, SequenceParserResult>(module, (module) =>
    module.parseRefSequence(refFastaStr, refFastaName),
  )
}

const worker = { parseRefSequence }
export type ParseRefSequenceWorker = typeof worker
export type ParseRefSequenceThread = ParseRefSequenceWorker

expose(worker)
