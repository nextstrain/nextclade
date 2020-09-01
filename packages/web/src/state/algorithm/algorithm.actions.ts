import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { AnalysisParams, AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { LocateInTreeParams, LocateInTreeResults } from 'src/algorithms/tree/treeFindNearestNodes'
import type { FinalizeTreeParams, FinalizeTreeResults } from 'src/algorithms/tree/treeAttachNodes'
import type { QCResult } from 'src/algorithms/QC/runQC'
import type { Sorting } from 'src/helpers/sortResults'
import type { AlgorithmGlobalStatus, CladeAssignmentResult, InputFile } from './algorithm.state'

const action = actionCreatorFactory('Algorithm')

export const setInput = action<string>('setInput')
export const setInputFile = action<InputFile>('setInputFile')
export const setIsDirty = action<boolean>('setIsDirty')

export const setAlgorithmGlobalStatus = action<AlgorithmGlobalStatus>('setAlgorithmGlobalStatus')
export const algorithmRunAsync = action.async<string | File | undefined, void, Error>('run')

export const parseAsync = action.async<string | File, string[], Error>('parse')
export const analyzeAsync = action.async<AnalysisParams, AnalysisResultWithoutClade, Error>('analyze')
export const treeBuildAsync = action.async<LocateInTreeParams, LocateInTreeResults, Error>('treeBuild')
export const setClades = action<CladeAssignmentResult[]>('setClades')
export const setQcResults = action<QCResult[]>('setQcResults')
export const treeFinalizeAsync = action.async<FinalizeTreeParams, FinalizeTreeResults, Error>('treeFinalizeAsync')

export const exportCsvTrigger = action('exportCsvTrigger')
export const exportTsvTrigger = action('exportTsvTrigger')
export const exportJsonTrigger = action('exportJsonTrigger')

export const setSeqNamesFilter = action<string | undefined>('setSeqNamesFilter')
export const setMutationsFilter = action<string | undefined>('setMutationsFilter')
export const setAAFilter = action<string | undefined>('setAAFilter')
export const setCladesFilter = action<string | undefined>('setCladesFilter')

export const setShowGood = action<boolean>('setShowGood')
export const setShowMediocre = action<boolean>('setShowMediocre')
export const setShowBad = action<boolean>('setShowBad')
export const setShowErrors = action<boolean>('setShowErrors')

export const resultsSortTrigger = action<Sorting>('resultsSortTrigger')
