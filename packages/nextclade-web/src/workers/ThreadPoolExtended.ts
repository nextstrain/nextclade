import type { Pool as PoolType, PoolOptions } from 'threads/pool'
import type { TaskRunFunction, WorkerDescriptor } from 'threads/pool-types'
import { Pool as createPool, Thread } from 'threads'
import { concurrent } from 'fasy'
import { spawn } from 'src/workers/spawn'

export class PoolExtended<ThreadType extends Thread> {
  private pool: PoolType<ThreadType>
  private workers: ThreadType[] = []
  private readonly workerFn: () => Worker

  private getWorkers(): WorkerDescriptor<ThreadType>[] {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.pool.workers as unknown as WorkerDescriptor<ThreadType>[]
  }

  private constructor(workerFn: () => Worker, options?: PoolOptions) {
    this.workerFn = workerFn
    this.pool = createPool<ThreadType>(async () => this.spawnWorker(), options)
  }

  public static async create<ThreadType extends Thread>(workerFn: () => Worker, options?: PoolOptions) {
    const self = new PoolExtended<ThreadType>(workerFn, options)

    self.workers = await concurrent.map(async (poolWorkerPromise: WorkerDescriptor<ThreadType>) => {
      return poolWorkerPromise.init
    }, self.getWorkers())

    return self
  }

  /** Runs a function once on every worker  */
  public async forEachWorker(fn: (thread: ThreadType) => void | Promise<void>) {
    return concurrent.forEach(fn, this.workers)
  }

  public async completed(allowResolvingImmediately?: boolean) {
    return this.pool.completed(allowResolvingImmediately)
  }

  public async settled(allowResolvingImmediately?: boolean) {
    return this.pool.settled(allowResolvingImmediately)
  }

  public events() {
    return this.pool.events()
  }

  public async queue<Return>(task: TaskRunFunction<ThreadType, Return>): Promise<Return> {
    return this.pool.queue(task)
  }

  /** Spawn a thread that does not belong to the pool yet, for example as a replacement in `replaceWorker()` */
  public async spawnWorker(): Promise<ThreadType> {
    return spawn<ThreadType>(this.workerFn())
  }

  /**
   * Replace the given pool thread with a replacement from `spawnWorker()`, and terminate the given thread.
   *
   * On failure the pool is unchanged and the caller still owns the replacement.
   */
  public async replaceWorker(thread: ThreadType, replacement: ThreadType): Promise<void> {
    await this.pool.replaceWorker(thread, replacement)
    this.workers = this.workers.map((worker) => (worker === thread ? replacement : worker))
  }

  public async terminate(force?: boolean) {
    return this.pool.terminate(force)
  }
}
