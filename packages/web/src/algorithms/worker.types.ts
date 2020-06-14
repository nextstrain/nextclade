import type { AlgorithmResult } from './run'
import { AlgorithmParams } from './run'

export interface AlgorithmWorkerInputEvent {
  data: AlgorithmParams
}

export interface AlgorithmWorkerOutputEventData {
  result: AlgorithmResult
  error: string
}

export interface AlgorithmWorkerOutputEvent extends MessageEvent {
  data: AlgorithmWorkerOutputEventData
}
