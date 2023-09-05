import 'regenerator-runtime'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { MinimizerSearchResult } from 'src/types'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { NextcladeSeqAutodetectWasm } from 'src/gen/nextclade-wasm'

/**
 * Keeps the reference to the WebAssembly module.The module is stateful and requires manual initialization
 * and teardown.
 * This cloud be a class instance, but unfortunately we cannot pass classes to/from WebWorkers (yet?).
 */
let nextcladeAutodetect: NextcladeSeqAutodetectWasm | undefined

/** Creates the underlying WebAssembly module. */
async function create(minimizerIndexJsonStr: string) {
  nextcladeAutodetect = NextcladeSeqAutodetectWasm.new(JSON.stringify(minimizerIndexJsonStr))
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeAutodetect) {
    return
  }

  nextcladeAutodetect.free()
  nextcladeAutodetect = undefined
}

async function autodetect(fasta: string, onResult: (r: MinimizerSearchResult) => void): Promise<void> {
  if (!nextcladeAutodetect) {
    throw new ErrorModuleNotInitialized('autodetect')
  }

  function onResultParsed(resStr: string) {
    const result = JSON.parse(resStr) as MinimizerSearchResult
    onResult(result)
  }

  nextcladeAutodetect.autodetect(fasta, onResultParsed)
}

const worker = {
  create,
  destroy,
  autodetect,
}

expose(worker)

export type NextcladeSeqAutodetectWasmWorker = typeof worker
export type NextcladeSeqAutodetectWasmThread = NextcladeSeqAutodetectWasmWorker & Thread

export class ErrorModuleNotInitialized extends ErrorInternal {
  constructor(fnName: string) {
    super(
      `This WebWorker module has not been initialized yet. When calling module.${fnName} Make sure to call 'module.create()' function.`,
    )
  }
}
