import 'regenerator-runtime'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import { NextcladeWasm, NextcladeParams, AnalysisInput } from 'src/gen/nextclade-wasm'

export class ErrorModuleNotInitialized extends Error {
  constructor() {
    super(
      'Developer error: this WebWorker module has not been initialized yet. Make sure to call `module.create()` function.',
    )
  }
}

/**
 * Keeps the reference to the WebAssembly module.The module is stateful and requires manual initialization
 * and teardown.
 * This cloud be a class instance, but unfortunately we cannot pass classes to/from WebWorkers (yet?).
 */
let gNextcladeWasm: NextcladeWasm | undefined

/** Creates the underlying WebAssembly module. */
async function create() {
  const params = NextcladeParams.from_js({ foo: 42 })
  gNextcladeWasm = new NextcladeWasm(params)
  params.free()
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  gNextcladeWasm?.free()
  gNextcladeWasm = undefined
}

/** Runs the underlying WebAssembly module. */
async function run() {
  if (!gNextcladeWasm) {
    throw new ErrorModuleNotInitialized()
  }
  const input = AnalysisInput.from_js({ bar: 'Hello!' })
  const result = gNextcladeWasm.run(input)
  return result.to_js()
}

const analysisWorker = { create, destroy, run }
export type AnalysisWorker = typeof analysisWorker
export type AnalysisThread = AnalysisWorker & Thread

expose(analysisWorker)
