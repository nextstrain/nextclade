import 'regenerator-runtime'

import { isNumber } from 'lodash'
import serializeJavascript from 'serialize-javascript'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import emscriptenJsRaw from 'src/generated/wasm/nextclade_wasm.js'
import wasmPath from 'src/generated/wasm/nextclade_wasm.wasm'

export class WasmNativeError extends Error {}

export class WasmNativeErrorUnknown extends Error {}

export async function runWasmModule<T>(module: MyModule, runFunction: (module: MyModule) => T) {
  console.log({ module })

  try {
    return runFunction(module)
  } catch (error: unknown) {
    if (error instanceof Error) {
      error.message = `When running Webassembly module: ${error.message}`
      throw error
    }

    if (isNumber(error)) {
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
  console.log({ emscriptenJsRaw })
  console.log({ wasmPath })

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

export function run(i: number | string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => {
    console.info(module.getObject())
    console.info(JSON.stringify(module.convertToString({ name: 'Alice', age: 27, foo: { bar: 2.74 } }), null, 2))
    return i
  })
}

export function vectorToArray(vec: Vector) {
  return new Array(vec.size()).fill(0).map((_, i) => vec.get(i))
}

const worker = { init, run }

export type WasmWorker = typeof worker

export type WasmWorkerThread = WasmWorker & Thread

expose(worker)
