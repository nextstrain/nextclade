import { Pool } from 'threads'

import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { TreeBuildThread } from 'src/workers/worker.treeFindNearest'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { TreeFinalizeThread } from 'src/workers/worker.treeAttachNodes'

export interface WorkerPools {
  threadParse: ParseThread
  poolAnalyze: Pool<AnalyzeThread>
  threadTreeBuild: TreeBuildThread
  poolRunQc: Pool<RunQcThread>
  threadTreeFinalize: TreeFinalizeThread
}
