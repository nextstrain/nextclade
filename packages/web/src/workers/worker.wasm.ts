import 'regenerator-runtime'

import { isNumber } from 'lodash'
import serializeJavascript from 'serialize-javascript'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import type { EmscriptenRuntimeModule, MyModule } from 'src/workers/types2'

import emscriptenJsRaw from 'src/.generated/wasm/nextclade'
import wasmPath from 'src/.generated/wasm/nextclade.wasm'

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
  return new Promise((resolve) => {
    const js = emscriptenJsRaw as EmscriptenRuntimeModule
    const module = js({
      locateFile: (path: string) => {
        return path.includes(name) && path.endsWith('.wasm') ? wasmPath : path
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
    module = await loadWasmModule('nextclade')
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

  return runWasmModule(module, (module) => {
    const res = module.add(3, 5)
    // console.info(res)

    // console.info(module.concat('a', 'b'))
    // console.info(module.getObject())
    // console.info(module.getPerson())
    // console.info(module.toString({ name: 'Alice', age: 27, foo: { bar: 2.74 } }))

    // console.info(module.getOptional(new module.hello(42)))

    const c = new module.NodeArray()
    c.push_back({
      foo: 12,
      bar: 'world',
      children: new module.OptionalNodeArray(),
    })

    const json = {
      foo: 42,
      bar: 'hello',
      children: new module.OptionalNodeArray(c),
    }

    const resJson = module.getAuspiceJson(json)
    console.log(resJson)

    console.log(vectorToArray(resJson.children.value()))

    // console.info({ resJson, children: resJson.children.hasValue() ? resJson.children.value() : 'no value' })

    // module.kaboom()

    return res
  })
}

export function vectorToArray(vec: Vector) {
  return new Array(vec.size()).fill(0).map((_, i) => vec.get(i))
}

const worker = { init, run }

export type WasmWorker = typeof worker

export type WasmWorkerThread = WasmWorker & Thread

expose(worker)
