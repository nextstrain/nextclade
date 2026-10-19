import type { AnalysisError, AnalysisResult } from 'src/types'
import { createFakeThread, FakeNativeWorker, FakeThreadState, fatalError } from './helpers/fakeThreads'

const mocks = vi.hoisted(() => ({ spawnBase: vi.fn<(worker: unknown) => Promise<unknown>>() }))

vi.mock('threads', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  spawn: mocks.spawnBase,
}))

const RESULTS: AnalysisResult[] = []
const ERRORS: AnalysisError[] = []

describe('ExportWorker', () => {
  let threads: FakeExportThread[] = []
  let nextThreads: FakeExportThread[] = []

  beforeEach(() => {
    vi.resetModules() // every test starts without the singleton
    vi.stubGlobal('Worker', FakeNativeWorker)
    FakeNativeWorker.instances = []
    threads = []
    nextThreads = []
    mocks.spawnBase.mockReset()
    mocks.spawnBase.mockImplementation(async () => {
      const fake = nextThreads.shift() ?? createExportThread()
      threads.push(fake)
      return fake.thread
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('settles every concurrent call after a fatal error and terminates the worker after the last call', async () => {
    const { ExportWorker } = await import('src/workers/ExportThread')
    const tblResult = Promise.withResolvers<string>()
    nextThreads = [createExportThread({ gff: Promise.reject(fatalError('panicked in gff')), tbl: tblResult.promise })]
    const worker = await ExportWorker.get()

    const gff = worker.serializeResultsGff(RESULTS)
    const tbl = worker.serializeResultsTbl(RESULTS)
    await expect(gff).rejects.toMatchObject({ name: 'ErrorInternalWasm', message: 'panicked in gff' })
    const callsBeforeLastSettled = [...threads[0].state.calls]
    tblResult.reject(fatalError('panicked in gff'))
    await expect(tbl).rejects.toMatchObject({ name: 'ErrorInternalWasm' })
    await vi.waitFor(() => expect(threads[0].state.isTerminated).toBe(true))

    expect(callsBeforeLastSettled).toStrictEqual(['serializeResultsGff', 'serializeResultsTbl'])
    expect(threads[0].state.calls).toStrictEqual(['serializeResultsGff', 'serializeResultsTbl', 'destroy', 'terminate'])
  })

  it('spawns a new worker on the next request after a fatal error, and refuses calls on the retired worker', async () => {
    const { ExportWorker } = await import('src/workers/ExportThread')
    nextThreads = [createExportThread({ gff: Promise.reject(fatalError('panicked in gff')) })]
    const retired = await ExportWorker.get()
    await expect(retired.serializeResultsGff(RESULTS)).rejects.toMatchObject({ name: 'ErrorInternalWasm' })

    const next = await ExportWorker.get()
    const refusal = retired.serializeResultsNdjson(RESULTS, ERRORS)

    expect(next).not.toBe(retired)
    await expect(next.serializeResultsNdjson(RESULTS, ERRORS)).resolves.toBe('ndjson')
    await expect(refusal).rejects.toMatchObject({ name: 'ErrorInternalWasm', message: 'panicked in gff' })
    expect(threads[0].state.calls).not.toContain('serializeResultsNdjson')
  })

  it('keeps the worker after a non-fatal error', async () => {
    const { ExportWorker } = await import('src/workers/ExportThread')
    nextThreads = [createExportThread({ gff: Promise.reject(new Error('Unable to write GFF')) })]
    const worker = await ExportWorker.get()

    await expect(worker.serializeResultsGff(RESULTS)).rejects.toThrow('Unable to write GFF')

    expect(await ExportWorker.get()).toBe(worker)
    await expect(worker.serializeResultsTbl(RESULTS)).resolves.toBe('tbl')
    expect(threads[0].state.isTerminated).toBe(false)
  })

  it('shares one start-up between concurrent requests', async () => {
    const { ExportWorker } = await import('src/workers/ExportThread')

    const [first, second] = await Promise.all([ExportWorker.get(), ExportWorker.get()])

    expect(first).toBe(second)
    expect(mocks.spawnBase).toHaveBeenCalledTimes(1)
  })

  it('terminates the native worker when the start-up fails, and starts a new worker on the next request', async () => {
    const { ExportWorker } = await import('src/workers/ExportThread')
    mocks.spawnBase.mockRejectedValueOnce(new Error('Timeout: Did not receive an init message from worker'))

    await expect(ExportWorker.get()).rejects.toThrow('Timeout')
    const worker = await ExportWorker.get()

    await expect(worker.serializeResultsTbl(RESULTS)).resolves.toBe('tbl')
    expect(FakeNativeWorker.instances.map((instance) => instance.terminate.mock.calls.length)).toStrictEqual([1, 0])
  })
})

interface FakeExportThread {
  thread: unknown
  state: FakeThreadState
}

/** Fake thread of `nextcladeWasm.worker.ts` with the serializer calls that the tests use */
function createExportThread({
  gff = Promise.resolve('gff'),
  tbl = Promise.resolve('tbl'),
}: { gff?: Promise<string>; tbl?: Promise<string> } = {}): FakeExportThread {
  // Attach handlers, so that a rejection which a test sets up before the call is not reported as unhandled
  gff.catch(() => undefined)
  tbl.catch(() => undefined)
  return createFakeThread({
    async destroy() {},
    async serializeResultsGff(_results: AnalysisResult[]) {
      return gff
    },
    async serializeResultsTbl(_results: AnalysisResult[]) {
      return tbl
    },
    async serializeResultsNdjson(_results: AnalysisResult[], _errors: AnalysisError[]) {
      return 'ndjson'
    },
  })
}
