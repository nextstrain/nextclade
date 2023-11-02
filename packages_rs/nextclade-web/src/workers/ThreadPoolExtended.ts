import type { Pool as PoolType, PoolOptions } from 'threads/dist/master/pool'
import type { TaskRunFunction, WorkerDescriptor } from 'threads/dist/master/pool-types'
import { Pool as createPool, Thread } from 'threads'
import { concurrent } from 'fasy'
import { spawn } from 'src/workers/spawn'

export class PoolExtended<ThreadType extends Thread> {
  private pool: PoolType<ThreadType>
  private workers: ThreadType[] = []

  private getWorkers(): WorkerDescriptor<ThreadType>[] {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.pool.workers as unknown as WorkerDescriptor<ThreadType>[]
  }

  private constructor(workerFn: () => Worker, options?: PoolOptions) {
    this.pool = createPool<ThreadType>(() => spawn<ThreadType>(workerFn()), options)
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

  public async queue<Return>(task: TaskRunFunction<ThreadType, Return>) {
    return this.pool.queue(task)
  }

  public async terminate(force?: boolean) {
    return this.pool.terminate(force)
  }
}
