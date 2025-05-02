import 'regenerator-runtime'

import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { MinimizerIndexJson, MinimizerSearchRecord, FindBestDatasetsResult } from 'src/types'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { NextcladeSeqAutodetectWasm } from 'src/gen/nextclade-wasm'

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

/** Creates the underlying WebAssembly module. */
async function create(minimizerIndexJsonStr: MinimizerIndexJson) {
  nextcladeAutodetect = NextcladeSeqAutodetectWasm.new(
    JSON.stringify(minimizerIndexJsonStr),
    JSON.stringify({ batchIntervalMs: 250, maxBatchSize: 1000 }),
  )
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeAutodetect) {
    return
  }

  nextcladeAutodetect.free()
  nextcladeAutodetect = undefined

  // eslint-disable-next-line no-restricted-globals
  self.close()
}

async function autodetect(fasta: string): Promise<void> {
  if (!nextcladeAutodetect) {
    throw new ErrorModuleNotInitialized('autodetect')
  }

  try {
    nextcladeAutodetect.autodetect(fasta, onResultParsed)
  } catch (error: unknown) {
    gSubject.error(sanitizeError(error))
  }

  gSubject.complete()
}

async function findBestDatasets(): Promise<FindBestDatasetsResult> {
  if (!nextcladeAutodetect) {
    throw new ErrorModuleNotInitialized('find_best_datasets')
  }
  return JSON.parse(nextcladeAutodetect.find_best_datasets()) as unknown as FindBestDatasetsResult
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
