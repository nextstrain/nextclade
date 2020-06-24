import type { Dispatch } from 'redux'
// import { eventChannel, END } from 'redux-saga'
import type { WorkerPools } from 'src/workers/types'

export enum PoolEventType {
  initialized = 'initialized',
  taskCanceled = 'taskCanceled',
  taskCompleted = 'taskCompleted',
  taskFailed = 'taskFailed',
  taskQueued = 'taskQueued',
  taskQueueDrained = 'taskQueueDrained',
  taskStart = 'taskStart',
  terminated = 'terminated',
}

export function subscribeToWorkerPools(dispatch: Dispatch, { poolParse, poolAnalyze }: WorkerPools) {
  const observableParse = poolParse.events()

  const subscription = observableParse.subscribe((observable) => {
    // const chan = eventChannel((emit) => {
    switch (observable.type) {
      case PoolEventType.taskStart: {
        break
      }

      case PoolEventType.taskCompleted: {
        // dispatch({ type: 'TASK_COMPLETED', payload: { taskId: observable.taskID, result: observable.returnValue } })
        // dispatch({ type: 'TASK_COMPLETED', payload: { taskId: observable.taskID, result: observable.returnValue } })
        break
      }

      case PoolEventType.taskFailed: {
        break
      }

      case PoolEventType.terminated: {
        // dispatch(END)
        break
      }

      default:
        break
    }

    return () => subscription.unsubscribe()
  })
  // })
}
