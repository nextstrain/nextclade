import 'regenerator-runtime'

import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { MinimizerIndexJson, MinimizerSearchRecord, FindBestDatasetsResult, DatasetsIndexJson } from 'src/types'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { NextcladeSeqAutodetectWasm } from 'src/gen/nextclade-wasm'
import { WasmCallGuard } from 'src/workers/WasmCallGuard'

const gSubject = new Subject<MinimizerSearchRecord[]>()

function onResultParsed(res: MinimizerSearchRecord[]) {
  gSubject.next(res)
}

/**
 * Keeps the reference to the WebAssembly module.The module is stateful and requires manual initialization
 * and teardown.
 * This cloud be a class instance, but unfortunately we cannot pass classes to/from WebWorkers (yet?).
 */
let nextcladeAutodetect: NextcladeSeqAutodetectWasm | undefined

/** Guards every call into the WebAssembly instance of this worker against use after a fatal error */
const wasmCallGuard = new WasmCallGuard()

/** Creates the underlying WebAssembly module. */
async function create(indexJson: DatasetsIndexJson, minimizerIndexJsonStr: MinimizerIndexJson) {
  const indexJsonStr = JSON.stringify(indexJson)
  const minimizerIndexStr = JSON.stringify(minimizerIndexJsonStr)
  const searchParamsStr = JSON.stringify({ batchIntervalMs: 250, maxBatchSize: 1000 })
  nextcladeAutodetect = wasmCallGuard.call(() =>
    NextcladeSeqAutodetectWasm.new(indexJsonStr, minimizerIndexStr, searchParamsStr),
  )
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeAutodetect) {
    return
  }

  try {
    nextcladeAutodetect.free()
  } catch {
    // Ignore errors during cleanup - WASM state may be corrupted after a fatal error.
    // Logging the cleanup error would mask the original error message.
  }
  nextcladeAutodetect = undefined
}

async function autodetect(fasta: string): Promise<void> {
  if (!nextcladeAutodetect) {
    throw new ErrorModuleNotInitialized('autodetect')
  }
  const wasm = nextcladeAutodetect

  try {
    wasmCallGuard.call(() => wasm.autodetect(fasta, onResultParsed))
  } catch (error: unknown) {
    gSubject.error(sanitizeError(error))
  }

  gSubject.complete()
}

async function findBestDatasets(): Promise<FindBestDatasetsResult> {
  if (!nextcladeAutodetect) {
    throw new ErrorModuleNotInitialized('find_best_datasets')
  }
  const wasm = nextcladeAutodetect
  return JSON.parse(wasmCallGuard.call(() => wasm.find_best_datasets())) as unknown as FindBestDatasetsResult
}

const worker = {
  create,
  destroy,
  autodetect,
  findBestDatasets,
  values(): ThreadsObservable<MinimizerSearchRecord[]> {
    return ThreadsObservable.from(gSubject)
  },
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
