import React, { useEffect, useState } from 'react'

import { isNumber } from 'lodash'
import serializeJavascript from 'serialize-javascript'

export type EmscriptenModulePair = [js: EmscriptenRuntimeModule, wasm: WasmModulePath]

export interface WasmModulePath {
  default: string
}

export interface EmscriptenModule {
  locateFile(path: string): string
  onRuntimeInitialized(): void
}

export type EmscriptenRuntimeModule = {
  default(options: EmscriptenModule): Promise<MyModule>
}

export interface MyModule extends EmscriptenModule {
  add(x: number, y: number): number
  concat(x: string, y: string): string
  getObject(): object // eslint-disable-line @typescript-eslint/ban-types
  getPerson(): object // eslint-disable-line @typescript-eslint/ban-types
  toString({ name, age, foo }: { name: string; age: number; foo: { bar: number } }): string
  kaboom(): void
  getExceptionMessage(errorPointer: number): string
}

export async function loadWasmModule(name: string): Promise<MyModule> {
  const [js, wasm] = (await Promise.all([
    import(`src/wasm/${name}.js`),
    import(`src/wasm/${name}.wasm`),
  ])) as EmscriptenModulePair

  return new Promise((resolve, reject) => {
    const module = js.default({
      locateFile: (path: string) => (path.endsWith('.wasm') ? wasm.default : path),
      onRuntimeInitialized: () => resolve(module),
    })
  })
}

export class WasmNativeError extends Error {}
export class WasmNativeErrorUnknown extends Error {}

export async function runWasmModule<T>(module: MyModule, runFunction: (module: MyModule) => T) {
  try {
    const result = runFunction(module)
    return { module, result }
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

export default function Index() {
  const [value, setValue] = useState<number>()

  useEffect(() => {
    loadWasmModule('nextclade')
      .then((module) =>
        runWasmModule(module, (module) => {
          const res = module.add(3, 5)
          console.info(res)

          console.info(module.concat('a', 'b'))
          console.info(module.getObject())
          console.info(module.getPerson())
          console.info(module.toString({ name: 'Alice', age: 27, foo: { bar: 2.74 } }))
          setValue(res)

          module.kaboom()
        }),
      )
      .catch(console.error)
  }, [])

  return <div>{value ?? 'Calculating...'}</div>
}
