import type { Sorting } from 'src/helpers/sortResults'
import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { NextcladeResult } from 'src/workers/worker.analyze'
import type { AlgorithmGlobalStatus, AlgorithmInput } from './algorithm.state'

const action = actionCreatorFactory('Algorithm')

export const setNumThreads = action<number>('setNumThreads')

export const setIsDirty = action<boolean>('setIsDirty')

export const setFasta = action.async<AlgorithmInput, { queryStr: string }, Error>('setFasta')
export const setTree = action.async<AlgorithmInput, { treeStr: string }, Error>('setTree')
export const setRootSeq = action.async<AlgorithmInput, { refStr: string }, Error>('setRootSeq')
export const setQcSettings = action.async<AlgorithmInput, { qcConfigStr: string }, Error>('setQcSettings')
export const setGeneMap = action.async<AlgorithmInput, { geneMapStr: string }, Error>('setGeneMap')
export const setPcrPrimers = action.async<AlgorithmInput, { pcrPrimerCsvRowsStr: string }, Error>('setPcrPrimers')

export const removeFasta = action('removeFasta')
export const removeTree = action('removeTree')
export const removeRootSeq = action('removeRootSeq')
export const removeQcSettings = action('removeQcSettings')
export const removeGeneMap = action('removeGeneMap')
export const removePcrPrimers = action('removePcrPrimers')

export const setAlgorithmGlobalStatus = action<AlgorithmGlobalStatus>('setAlgorithmGlobalStatus')
export const algorithmRunAsync = action.async<AlgorithmInput | undefined, void, Error>('algorithmRunAsync')

export const addParsedSequence = action<{ index: number; seqName: string }>('addParsedSequence')
export const addNextcladeResult = action<{ nextcladeResult: NextcladeResult }>('addNextcladeResult')
export const setTreeResult = action<{ treeStr: string }>('setTreeResult')

export const exportCsvTrigger = action('exportCsvTrigger')
export const exportTsvTrigger = action('exportTsvTrigger')
export const exportJsonTrigger = action('exportJsonTrigger')
export const exportTreeJsonTrigger = action('exportTreeJsonTrigger')

export const setSeqNamesFilter = action<string | undefined>('setSeqNamesFilter')
export const setMutationsFilter = action<string | undefined>('setMutationsFilter')
export const setAAFilter = action<string | undefined>('setAAFilter')
export const setCladesFilter = action<string | undefined>('setCladesFilter')

export const setShowGood = action<boolean>('setShowGood')
export const setShowMediocre = action<boolean>('setShowMediocre')
export const setShowBad = action<boolean>('setShowBad')
export const setShowErrors = action<boolean>('setShowErrors')

export const resultsSortTrigger = action<Sorting>('resultsSortTrigger')
