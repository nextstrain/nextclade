import type { Dispatch } from 'redux'
import type { WorkerPools } from 'src/workers/types'

export function subscribeToWorkerPools(dispatch: Dispatch, { poolParse, poolAnalyze }: WorkerPools) {
  const observableParse = poolParse.events()

  observableParse.subscribe((observable) => {
    if (observable.type === 'taskCompleted') {
      dispatch({ type: 'TASK_COMPLETED', payload: { taskId: observable.taskID, result: observable.returnValue } })
    }
  })
}
