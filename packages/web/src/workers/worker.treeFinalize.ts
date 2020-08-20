import 'regenerator-runtime'

import type { FunctionThread } from 'threads'
import { expose } from 'threads/worker'

import { finalizeTree } from '../algorithms/tree/finalizeTree'

expose(finalizeTree)

export type TreeFinalizeParameters = Parameters<typeof finalizeTree>
export type TreeFinalizeReturn = ReturnType<typeof finalizeTree>
export type TreeFinalizeThread = FunctionThread<TreeFinalizeParameters, TreeFinalizeReturn>
