import 'regenerator-runtime'

import type { FunctionThread } from 'threads'
import { expose } from 'threads/worker'

import { treeFindNearestNodes } from 'src/algorithms/tree/treeFindNearestNodes'

expose(treeFindNearestNodes)

export type TreeBuildParameters = Parameters<typeof treeFindNearestNodes>
export type TreeBuildReturn = ReturnType<typeof treeFindNearestNodes>
export type TreeBuildThread = FunctionThread<TreeBuildParameters, TreeBuildReturn>
