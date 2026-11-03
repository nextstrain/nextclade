import { Thread } from 'threads'
import type { DatasetsIndexJson, FindBestDatasetsResult, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import type { NextcladeSeqAutodetectWasmThread } from 'src/workers/nextcladeAutodetect.worker'
import { spawn } from 'src/workers/spawn'

/**
 * Run dataset autodetection on the query sequences in a new worker, and terminate the worker afterwards.
 *
 * Calls `onResult` for each batch of per-sequence results as the worker streams them. Resolves with the best
 * datasets only after the worker has delivered every per-sequence result, so that callers can commit the run as one
 * complete outcome. Rejects with the first error of the search.
 */
export async function runSeqAutodetect(
  fasta: string,
  index: DatasetsIndexJson,
  minimizerIndex: MinimizerIndexJson,
  onResult: (results: MinimizerSearchRecord[]) => void,
): Promise<FindBestDatasetsResult> {
  const thread = await spawn<NextcladeSeqAutodetectWasmThread>(
    new Worker(new URL('src/workers/nextcladeAutodetect.worker.ts', import.meta.url), {
      name: 'src/workers/nextcladeAutodetect.worker.ts',
    }),
  )

  let unsubscribe: (() => void) | undefined
  try {
    await thread.create(index, minimizerIndex)

    const allResultsReceived = new Promise<void>((resolve, reject) => {
      const subscription = thread.values().subscribe(onResult, reject, resolve)
      unsubscribe = () => subscription.unsubscribe()
    })

    await thread.autodetect(fasta)
    await allResultsReceived
    return await thread.findBestDatasets()
  } finally {
    unsubscribe?.()
    // Terminating the Web Worker also releases its WebAssembly memory
    await Thread.terminate(thread)
  }
}
