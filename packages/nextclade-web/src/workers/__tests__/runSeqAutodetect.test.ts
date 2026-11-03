import { Observable, Subject } from 'threads/observable'
import type { DatasetsIndexJson, FindBestDatasetsResult, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { runSeqAutodetect } from 'src/workers/runSeqAutodetect'
import { createFakeThread, FakeNativeWorker, FakeThreadState } from './helpers/fakeThreads'

const mocks = vi.hoisted(() => ({ spawnBase: vi.fn<(worker: unknown) => Promise<unknown>>() }))

vi.mock('threads', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  spawn: mocks.spawnBase,
}))

const INDEX: DatasetsIndexJson = { collections: [], schemaVersion: '3.0.0' }
const MINIMIZER_INDEX: MinimizerIndexJson = {
  schemaVersion: '1.0.0',
  version: '1',
  params: { k: 17, cutoff: 28 },
  minimizers: {},
  references: [],
  normalization: [],
}
const FASTA = '>a\nACGT\n>b\nACGT\n'

const BEST_DATASETS: FindBestDatasetsResult = {
  suggestions: [{ name: 'nextstrain/sars-cov-2/wuhan-hu-1/orfs', nHits: 2, qryIndices: [0, 1] }],
  results: {},
}

describe('runSeqAutodetect', () => {
  let fake: FakeAutodetectThread

  beforeEach(() => {
    vi.stubGlobal('Worker', FakeNativeWorker)
    mocks.spawnBase.mockReset()
    mocks.spawnBase.mockImplementation(async () => fake.thread)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves with the best datasets only after the worker has delivered every sequence result', async () => {
    fake = createAutodetectThread({ batches: [[record(0)], [record(1)]] })
    const received: number[] = []

    const best = await runSeqAutodetect(FASTA, INDEX, MINIMIZER_INDEX, (results) => {
      received.push(...results.map((result) => result.fastaRecord.index))
    })

    expect(best).toStrictEqual(BEST_DATASETS)
    expect(received).toStrictEqual([0, 1])
    expect(fake.state.calls).toStrictEqual(['create', 'values', 'autodetect', 'findBestDatasets', 'terminate'])
  })

  it('rejects with the search error and terminates the worker', async () => {
    fake = createAutodetectThread({ batches: [[record(0)]], error: new Error('invalid FASTA') })

    const run = runSeqAutodetect(FASTA, INDEX, MINIMIZER_INDEX, () => {})

    await expect(run).rejects.toThrow('invalid FASTA')
    expect(fake.state.calls).not.toContain('findBestDatasets')
    expect(fake.state.isTerminated).toBe(true)
  })

  it('terminates the worker when its initialization fails', async () => {
    fake = createAutodetectThread({ batches: [], createError: new Error('minimizer index is malformed') })

    const run = runSeqAutodetect(FASTA, INDEX, MINIMIZER_INDEX, () => {})

    await expect(run).rejects.toThrow('minimizer index is malformed')
    expect(fake.state.isTerminated).toBe(true)
  })
})

interface FakeAutodetectThread {
  thread: unknown
  state: FakeThreadState
}

/**
 * Create a fake autodetect thread. Like the real worker, it answers `autodetect()` before the results reach the
 * caller: it streams the batches, then completes or fails the stream, after the call has returned.
 */
function createAutodetectThread({
  batches,
  error,
  createError,
}: {
  batches: MinimizerSearchRecord[][]
  error?: Error
  createError?: Error
}): FakeAutodetectThread {
  const subject = new Subject<MinimizerSearchRecord[]>()
  return createFakeThread({
    async create() {
      if (createError) {
        throw createError
      }
    },
    values() {
      return Observable.from(subject)
    },
    async autodetect() {
      setTimeout(() => {
        batches.forEach((batch) => subject.next(batch))
        if (error) {
          subject.error(error)
        } else {
          subject.complete()
        }
      }, 0)
    },
    async findBestDatasets() {
      return BEST_DATASETS
    },
  })
}

function record(index: number): MinimizerSearchRecord {
  return {
    fastaRecord: { index, seqName: `seq${index}`, seq: 'ACGT' },
    result: { totalHits: 1, maxScore: 1, datasets: [] },
  }
}
