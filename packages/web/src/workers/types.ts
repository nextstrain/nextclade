import { Pool } from 'threads'

import { ParseThread } from 'src/workers/worker.parse'
import { AnalyzeThread } from 'src/workers/worker.analyze'
import { RunQcThread } from 'src/workers/worker.runQc'

export interface WorkerPools {
  poolParse: Pool<ParseThread>
  poolAnalyze: Pool<AnalyzeThread>
  poolRunQc: Pool<RunQcThread>
}
