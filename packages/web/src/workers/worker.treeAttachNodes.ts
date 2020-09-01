import 'regenerator-runtime'

import type { FunctionThread } from 'threads'
import { expose } from 'threads/worker'

import { treeAttachNodes } from 'src/algorithms/tree/treeAttachNodes'

expose(treeAttachNodes)

export type TreeFinalizeParameters = Parameters<typeof treeAttachNodes>
export type TreeFinalizeReturn = ReturnType<typeof treeAttachNodes>
export type TreeFinalizeThread = FunctionThread<TreeFinalizeParameters, TreeFinalizeReturn>
