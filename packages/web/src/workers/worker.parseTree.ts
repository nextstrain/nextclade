import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface ParseTreeWasmModule {
  parseTree(treeStr: string): string
}

export async function parseTree(treeStr: string) {
  const module = await loadWasmModule<ParseTreeWasmModule>('nextclade_wasm')
  return runWasmModule<ParseTreeWasmModule, string>(module, (module) => {
    return module.parseTree(treeStr)
  })
}

const parseTreeWorker = { parseTree }
export type ParseTreeWorker = typeof parseTreeWorker
export type ParseTreeThread = ParseTreeWorker

expose(parseTreeWorker)
