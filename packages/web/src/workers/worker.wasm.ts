import 'regenerator-runtime'

import { isNumber } from 'lodash'
import serializeJavascript from 'serialize-javascript'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import emscriptenJsRaw from 'src/generated/wasm/nextclade_wasm.js'
import wasmPath from 'src/generated/wasm/nextclade_wasm.wasm'

import qcConfig from '../../../../data/sars-cov-2/qc.json'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import geneMapStr from '../../../../data/sars-cov-2/genemap.gff'
import refStr from '../../../../data/sars-cov-2/reference.fasta'
import queryStr from '../../../../data/sars-cov-2/sequence.fasta'

type MyModule = any

type EmscriptenRuntimeModule = any

export class WasmNativeError extends Error {}

export class WasmNativeErrorUnknown extends Error {}

export async function runWasmModule<T>(module: MyModule, runFunction: (module: MyModule) => T) {
  try {
    return runFunction(module)
  } catch (error: unknown) {
    if (error instanceof Error) {
      const newError = new Error(`When running Webassembly module: ${error.message}`)
      newError.stack = error.stack
      newError.name = error.name
      throw newError
    } else if (isNumber(error)) {
      const message = module.getExceptionMessage(error)
      throw new WasmNativeError(message)
    } else {
      const details = serializeJavascript(error, { space: 2 })
      throw new WasmNativeErrorUnknown(
        `When running Webassembly module: Unknown native module error. Details:\n${details}`,
      )
    }
  }
}

export async function loadWasmModule(name: string): Promise<MyModule> {
  return new Promise((resolve) => {
    const js = emscriptenJsRaw as EmscriptenRuntimeModule
    const module = js({
      locateFile: (path: string) => {
        return /* path.includes(name) && */ path.endsWith('.wasm') ? wasmPath : path
      },
      onRuntimeInitialized: () => {
        resolve(module)
      },
    })
  })
}

let module: MyModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run() {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  const index = 0
  const geneMapName = 'genemap.gff'
  const treeString = JSON.stringify(treeJson)
  const pcrPrimersStr = ''
  const qcConfigStr = JSON.stringify(qcConfig)

  return runWasmModule(module, (module) => {
    const results = module.runNextclade(
      // prettier-ignore
      index,
      queryStr,
      refStr,
      geneMapStr,
      geneMapName,
      treeString,
      pcrPrimersStr,
      qcConfigStr,
    )
    const result = JSON.parse(results)[0]
    console.log({ result })
    return result
  })
}

// export function vectorToArray(vec: Vector) {
//   return new Array(vec.size()).fill(0).map((_, i) => vec.get(i))
// }

const worker = { init, run }

export type WasmWorker = typeof worker

export type WasmWorkerThread = WasmWorker & Thread

expose(worker)
