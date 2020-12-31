import type { AuspiceJsonV2 } from 'auspice'

import type { Sorting } from 'src/helpers/sortResults'
import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { AnalysisParams, AnalysisResult, Gene, PcrPrimer } from 'src/algorithms/types'
import type { AuspiceJsonV2Extended } from 'src/algorithms/tree/types'
import type { LocateInTreeParams, LocateInTreeResults } from 'src/algorithms/tree/treeFindNearestNodes'
import type { FinalizeTreeParams } from 'src/algorithms/tree/treeAttachNodes'
import type { QCResult, QCRulesConfig } from 'src/algorithms/QC/types'

import type { AlgorithmGlobalStatus, AlgorithmInput, CladeAssignmentResult } from './algorithm.state'

const action = actionCreatorFactory('Algorithm')

export const setIsDirty = action<boolean>('setIsDirty')

export const setFasta = action.async<AlgorithmInput, { seqData: string }, Error>('setFasta')
export const setTree = action.async<AlgorithmInput, { auspiceData: AuspiceJsonV2, geneMap: Gene[] }, Error>('setTree') // prettier-ignore
export const setRootSeq = action.async<AlgorithmInput, { rootSeq: string }, Error>('setRootSeq')
export const setQcSettings = action.async<AlgorithmInput, { qcRulesConfig: QCRulesConfig }, Error>('setQcSettings') // prettier-ignore
export const setGeneMap = action.async<AlgorithmInput, { geneMap: Gene[] }, Error>('setGeneMap')
export const setPcrPrimers = action.async<AlgorithmInput, { pcrPrimers: PcrPrimer[] }, Error>('setPcrPrimers') // prettier-ignore

export const removeFasta = action('removeFasta')
export const removeTree = action('removeTree')
export const removeRootSeq = action('removeRootSeq')
export const removeQcSettings = action('removeQcSettings')
export const removeGeneMap = action('removeGeneMap')
export const removePcrPrimers = action('removePcrPrimers')

export const setAlgorithmGlobalStatus = action<AlgorithmGlobalStatus>('setAlgorithmGlobalStatus')
export const algorithmRunAsync = action.async<void, void, Error>('algorithmRunAsync')
export const algorithmRunWithSequencesAsync = action.async<AlgorithmInput, void, Error>('algorithmRunWithSequencesAsync') // prettier-ignore

export const parseAsync = action.async<string | File, string[], Error>('parse')
export const analyzeAsync = action.async<AnalysisParams, AnalysisResult, Error>('analyze')
export const treeBuildAsync = action.async<LocateInTreeParams, LocateInTreeResults, Error>('treeBuild')
export const setClades = action<CladeAssignmentResult[]>('setClades')
export const setQcResults = action<QCResult[]>('setQcResults')
export const treeFinalizeAsync = action.async<FinalizeTreeParams, AuspiceJsonV2Extended, Error>('treeFinalizeAsync')
export const setOutputTree = action<string>('setOutputTree')

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
