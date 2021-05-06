// import { Pool } from 'threads'

import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalysisThread } from 'src/workers/worker.wasm'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'
// import type { AnalyzeThread } from 'src/workers/worker.analyze'
// import type { TreeBuildThread } from 'src/workers/worker.treeFindNearest'
// import type { RunQcThread } from 'src/workers/worker.runQc'
// import type { TreeFinalizeThread } from 'src/workers/worker.treeAttachNodes'

export interface WorkerPools {
  threadTreePrepare: TreePrepareThread
  threadParse: ParseThread
  threadWasm: AnalysisThread
  threadTreeFinalize: TreeFinalizeThread
  // poolAnalyze: Pool<AnalyzeThread>
  // threadTreeBuild: TreeBuildThread
  // poolRunQc: Pool<RunQcThread>
  // threadTreeFinalize: TreeFinalizeThread
}
