import type { AlgorithmParams, AlgorithmResult } from './run'
import type { AlgorithmWorkerOutputEvent } from './worker.types'

let runImpl = async (args: AlgorithmParams): Promise<AlgorithmResult> => {
  return Promise.reject(new Error('Web workers are not supported'))
}

if (typeof Worker !== 'undefined') {
  const worker = new Worker('./worker.ts', { type: 'module', name: 'algorithm' })

  runImpl = async (args: AlgorithmParams) => {
    return new Promise<AlgorithmResult>((resolve, reject) => {
      worker.addEventListener('message', (message: AlgorithmWorkerOutputEvent) => {
        const { result, error } = message.data

        if (result) {
          resolve(result)
          return
        }

        if (error) {
          reject(error)
        }
      })

      worker.addEventListener('error', (error) => {
        reject(error)
      })

      worker.postMessage(args)
    })
  }
}

export async function runInWorker(args: AlgorithmParams) {
  return runImpl(args)
}
