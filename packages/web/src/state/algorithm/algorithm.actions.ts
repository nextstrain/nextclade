import { UrlParams } from 'src/algorithms/types'
import type { DatasetFlat, Gene } from 'src/algorithms/types'
import { SortingKeyBased } from 'src/helpers/sortResults'
import type { Sorting } from 'src/helpers/sortResults'
import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { NextcladeResult } from 'src/workers/worker.analyze'
import type { AlgorithmGlobalStatus, AlgorithmInput, ExportParams } from './algorithm.state'

const action = actionCreatorFactory('Algorithm')

export const setNumThreads = action<number>('setNumThreads')

export const setIsDirty = action<boolean>('setIsDirty')

export const setDatasets = action<{
  defaultDatasetName: string
  defaultDatasetNameFriendly: string
  datasets: DatasetFlat[]
}>('setDatasets')

export const setCurrentDataset = action<DatasetFlat | undefined>('setCurrentDataset')
export const setInputUrlParams = action<UrlParams>('setInputUrlParams')

export const setFasta = action.async<AlgorithmInput, { queryStr: string; queryName: string }, Error>('setFasta')
export const setTree = action.async<AlgorithmInput, { treeStr: string }, Error>('setTree')
export const setRootSeq = action.async<AlgorithmInput, { refStr: string; refName: string }, Error>('setRootSeq')
export const setQcSettings = action.async<AlgorithmInput, { qcConfigStr: string }, Error>('setQcSettings')
export const setVirusJson = action.async<AlgorithmInput, { virusJsonStr: string }, Error>('setVirusJson')
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

export const setGenomeSize = action<{ genomeSize: number }>('setGenomeSize')
export const setGeneMapObject = action<{ geneMap: Gene[] }>('setGeneMapObject')
export const addParsedSequence = action<{ index: number; seqName: string }>('addParsedSequence')
export const addNextcladeResult = action<{ nextcladeResult: NextcladeResult }>('addNextcladeResult')
export const setTreeResult = action<{ treeStr: string }>('setTreeResult')
export const setCladeNodeAttrKeys = action<{ cladeNodeAttrKeys: string[] }>('setCladeNodeAttrKeys')
export const setResultsJsonStr = action<{ resultsJsonStr: string }>('setResultsJsonStr')

export const exportCsvTrigger = action<void>('exportCsvTrigger')
export const exportTsvTrigger = action<void>('exportTsvTrigger')
export const exportJsonTrigger = action<void>('exportJsonTrigger')
export const exportTreeJsonTrigger = action<void>('exportTreeJsonTrigger')
export const exportFastaTrigger = action<void>('exportFastaTrigger')
export const exportPeptides = action.async<void, void, Error>('exportPeptidesTrigger')
export const exportInsertionsCsvTrigger = action<void>('exportInsertionsCsvTrigger')
export const exportErrorsCsvTrigger = action<void>('exportErrorsCsvTrigger')
export const exportAll = action.async<void, void, Error>('exportAllTrigger')
export const setExportFilenames = action<ExportParams>('setExportFilenames')

export const setSeqNamesFilter = action<string | undefined>('setSeqNamesFilter')
export const setMutationsFilter = action<string | undefined>('setMutationsFilter')
export const setAAFilter = action<string | undefined>('setAAFilter')
export const setCladesFilter = action<string | undefined>('setCladesFilter')

export const setShowGood = action<boolean>('setShowGood')
export const setShowMediocre = action<boolean>('setShowMediocre')
export const setShowBad = action<boolean>('setShowBad')
export const setShowErrors = action<boolean>('setShowErrors')

export const resultsSortTrigger = action<Sorting>('resultsSortTrigger')
export const resultsSortByKeyTrigger = action<SortingKeyBased>('resultsSortByKeyTrigger')
