import type { DeepReadonly } from 'ts-essentials'
import type { AlgorithmResult, AlgorithmParams } from './types'

export interface AlgorithmWorkerInputEvent {
  data: DeepReadonly<AlgorithmParams>
}

export interface AlgorithmWorkerOutputEventData {
  result: DeepReadonly<AlgorithmResult>
  error: string
}

export interface AlgorithmWorkerOutputEvent extends MessageEvent {
  data: AlgorithmWorkerOutputEventData
}
