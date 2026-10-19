import type { FastaRecord, NextcladeParamsRaw, NextcladeResult } from 'src/types'
import { AnalysisWorkerPool } from 'src/workers/AnalysisWorkerPool'
import { createFakeThread, FakeNativeWorker, FakeThreadState, fatalError } from './helpers/fakeThreads'

const mocks = vi.hoisted(() => ({ spawnBase: vi.fn<(worker: unknown) => Promise<unknown>>() }))

vi.mock('threads', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  spawn: mocks.spawnBase,
}))

const PARAMS: NextcladeParamsRaw = { Dir: [] }

describe('AnalysisWorkerPool', () => {
  let threads: FakeAnalysisThread[] = []
  let nextThreads: FakeAnalysisThread[] = []

  beforeEach(() => {
    vi.stubGlobal('Worker', FakeNativeWorker)
    threads = []
    nextThreads = []
    mocks.spawnBase.mockReset()
    mocks.spawnBase.mockImplementation(async () => {
      const fake = nextThreads.shift() ?? createAnalysisThread()
      threads.push(fake)
      return fake.thread
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an error row for a sequence with a fatal error and analyzes the next sequence on a new worker', async () => {
    nextThreads = [createAnalysisThread({ fatalSeqNames: ['broken'] })]
    const pool = await AnalysisWorkerPool.create(1, PARAMS)

    const errorRow = await pool.analyze('ds', record(0, 'broken'))
    const nextResult = await pool.analyze('ds', record(1, 'good'))
    await pool.terminate()

    expect(errorRow).toStrictEqual({ index: 0, seqName: 'broken', error: 'panicked while analyzing broken' })
    expect(nextResult).toStrictEqual({ index: 1, seqName: 'good' })
    expect(threads).toHaveLength(2)
    expect(threads[0].state.calls).toStrictEqual(['create', 'analyze', 'terminate'])
    expect(threads[1].state.calls).toStrictEqual(['create', 'analyze', 'destroy', 'terminate'])
    expect(threads[1].createdWith).toBe(PARAMS)
  })

  it('fails the run on the fourth fatal error of a run', async () => {
    const seqNames = ['a', 'b', 'c', 'd']
    nextThreads = seqNames.map(() => createAnalysisThread({ fatalSeqNames: seqNames }))
    const pool = await AnalysisWorkerPool.create(1, PARAMS)

    const rows = [
      await pool.analyze('ds', record(0, 'a')),
      await pool.analyze('ds', record(1, 'b')),
      await pool.analyze('ds', record(2, 'c')),
    ]
    const lastAnalysis = pool.analyze('ds', record(3, 'd'))

    await expect(lastAnalysis).rejects.toMatchObject({
      name: 'ErrorInternalWasm',
      message: 'panicked while analyzing d',
    })
    expect(rows.map((row) => row.error)).toStrictEqual([
      'panicked while analyzing a',
      'panicked while analyzing b',
      'panicked while analyzing c',
    ])
    await pool.terminate()
  })

  it('rethrows a non-fatal error and keeps the worker', async () => {
    nextThreads = [createAnalysisThread({ failingSeqNames: ['invalid'] })]
    const pool = await AnalysisWorkerPool.create(1, PARAMS)

    await expect(pool.analyze('ds', record(0, 'invalid'))).rejects.toThrow('Unable to analyze invalid')
    const nextResult = await pool.analyze('ds', record(1, 'good'))
    await pool.terminate()

    expect(nextResult).toStrictEqual({ index: 1, seqName: 'good' })
    expect(threads).toHaveLength(1)
  })

  it('terminates a replacement that finishes its creation after termination started, and runs no task on it', async () => {
    const replacementCreation = Promise.withResolvers<void>()
    nextThreads = [
      createAnalysisThread({ fatalSeqNames: ['broken'] }),
      createAnalysisThread({ creation: replacementCreation.promise }),
    ]
    const pool = await AnalysisWorkerPool.create(1, PARAMS)

    const brokenAnalysis = pool.analyze('ds', record(0, 'broken'))
    const queuedAnalysis = pool.analyze('ds', record(1, 'queued'))
    await vi.waitFor(() => expect(threads[1]?.state.calls).toStrictEqual(['create']))
    const termination = pool.terminate()
    replacementCreation.resolve()
    await termination
    const analyses = await Promise.allSettled([brokenAnalysis, queuedAnalysis])

    expect(analyses[0]).toStrictEqual({
      status: 'fulfilled',
      value: { index: 0, seqName: 'broken', error: 'panicked while analyzing broken' },
    })
    expect(threads[1].state.calls).toStrictEqual(['create', 'terminate'])
    expect(threads.map(({ state }) => state.isTerminated)).toStrictEqual([true, true])
  })

  it('terminates every worker once when termination is requested repeatedly', async () => {
    const pool = await AnalysisWorkerPool.create(2, PARAMS)

    await Promise.all([pool.terminate(), pool.terminate()])
    await pool.terminate()

    expect(threads.map(({ state }) => state.calls)).toStrictEqual([
      ['create', 'destroy', 'terminate'],
      ['create', 'destroy', 'terminate'],
    ])
  })
})

interface FakeAnalysisThread {
  thread: unknown
  state: FakeThreadState
  /** Parameters of the last `create()` call */
  readonly createdWith: NextcladeParamsRaw | undefined
}

/**
 * Fake thread of `nextcladeWasm.worker.ts`. Like the worker behind `WasmCallGuard`, it refuses every call after a fatal
 * error with the same error
 */
function createAnalysisThread({
  fatalSeqNames = [],
  failingSeqNames = [],
  creation = Promise.resolve(),
}: { fatalSeqNames?: string[]; failingSeqNames?: string[]; creation?: Promise<void> } = {}): FakeAnalysisThread {
  let brokenError: Error | undefined
  let isCreated = false
  let createdWith: NextcladeParamsRaw | undefined

  const { thread, state } = createFakeThread({
    async create(params: NextcladeParamsRaw) {
      createdWith = params
      await creation
      isCreated = true
    },
    async destroy() {
      isCreated = false
    },
    async analyze(_datasetName: string, { index, seqName }: FastaRecord): Promise<NextcladeResult> {
      if (brokenError) {
        throw brokenError
      }
      if (!isCreated) {
        throw new Error('The WebAssembly module has not been created')
      }
      if (fatalSeqNames.includes(seqName)) {
        brokenError = fatalError(`panicked while analyzing ${seqName}`)
        throw brokenError
      }
      if (failingSeqNames.includes(seqName)) {
        throw new Error(`Unable to analyze ${seqName}`)
      }
      return { index, seqName }
    },
  })

  return {
    thread,
    state,
    get createdWith() {
      return createdWith
    },
  }
}

function record(index: number, seqName: string): FastaRecord {
  return { index, seqName, seq: 'ACGT' }
}
