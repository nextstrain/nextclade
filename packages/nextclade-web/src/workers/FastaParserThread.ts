import type { Subscription } from 'observable-fns'

import type { FastaRecord } from 'src/types'
import type { NextcladeWasmWorker } from 'src/workers/nextcladeWasm.worker'
import { spawn } from 'src/workers/spawn'

export class FastaParserWorker {
  private thread!: NextcladeWasmWorker
  private subscription?: Subscription<FastaRecord>

  private constructor() {}

  static async create() {
    const self = new FastaParserWorker()
    await self.init()
    return self
  }

  async init() {
    this.thread = await spawn<NextcladeWasmWorker>(
      new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url)),
    )
  }

  async parseSequencesStreaming(
    fastaStr: string,
    onSequence: (seq: FastaRecord) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
  ) {
    this.subscription = this.thread.values().subscribe(onSequence, onError, onComplete)
    await this.thread.parseSequencesStreaming(fastaStr)
  }

  async destroy() {
    await this.subscription?.unsubscribe() // eslint-disable-line @typescript-eslint/await-thenable
    await this.thread.destroy()
  }
}
