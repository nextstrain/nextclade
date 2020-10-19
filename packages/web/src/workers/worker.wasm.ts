import 'regenerator-runtime'
import { isNumber } from 'lodash'
import serializeJavascript from 'serialize-javascript'

import { expose } from 'threads/worker'

import type { EmscriptenRuntimeModule, MyModule } from 'src/workers/types2'

import emscriptenJsRaw from 'src/wasm/nextclade.js'
import wasmPath from 'src/wasm/nextclade.wasm'

export class WasmNativeError extends Error {}
export class WasmNativeErrorUnknown extends Error {}

export async function runWasmModule<T>(module: MyModule, runFunction: (module: MyModule) => T) {
  try {
    return runFunction(module)
  } catch (
    errorPointer: unknown // eslint-disable-line unicorn/catch-error-name
  ) {
    if (isNumber(errorPointer)) {
      const message = module.getExceptionMessage(errorPointer)
      throw new WasmNativeError(message)
    } else {
      const details = serializeJavascript(errorPointer, { space: 2 })
      throw new WasmNativeErrorUnknown(`Unknown native module error. Details:\n${details}`)
    }
  }
}

export async function loadWasmModule(name: string): Promise<MyModule> {
  return new Promise((resolve, reject) => {
    const js = emscriptenJsRaw as EmscriptenRuntimeModule
    const module = js({
      locateFile: (path: string) => (path.endsWith('.wasm') ? wasmPath : path),
      onRuntimeInitialized: () => resolve(module),
    })
  })
}

let module: MyModule | undefined

export async function init() {
  module = await loadWasmModule('nextclade')
}

export function run() {
  if (!module) {
    throw new Error('WebAssembly module has not been initialized yet')
  }

  return runWasmModule(module, (module) => {
    const res = module.add(3, 5)
    console.info(res)

    console.info(module.concat('a', 'b'))
    console.info(module.getObject())
    console.info(module.getPerson())
    console.info(module.toString({ name: 'Alice', age: 27, foo: { bar: 2.74 } }))

    module.kaboom()

    return res
  })
}

expose({ init, run })
