/* eslint-disable no-lone-blocks */
import i18n from 'src/i18n/i18n'

import type { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { selectNumThreads } from 'src/state/settings/settings.selectors'

export const selectParams = (state: State) => state.algorithm.params

export const selectDefaultDatasetName = (state: State) => selectParams(state).defaultDatasetName

export const selectDefaultDatasetNameFriendly = (state: State) => selectParams(state).defaultDatasetNameFriendly

export const selectDatasets = (state: State) => selectParams(state).datasets

export const selectCurrentDataset = (state: State) => selectParams(state).datasetCurrent

export const selectDefaultDataset = (state: State) => {
  const datasets = selectDatasets(state)
  const defaultDatasetName = selectDefaultDatasetName(state)
  return datasets.find((dataset) => dataset.name === defaultDatasetName)
}

export const selectResults = (state: State) => state.algorithm.results

export const selectResultsArray = (state: State) => state.algorithm.results.map((result) => result.result)

export const selectResultsState = (state: State) => state.algorithm.results

export const selectIsDirty = (state: State): boolean => state.algorithm.isDirty

export const selectHasRequiredInputs = (state: State): boolean => selectQueryStr(state) !== undefined

export const selectIsInProgressFasta = (state: State) => state.algorithm.params.inProgress.seqData !== 0
export const selectIsInProgressTree = (state: State) => state.algorithm.params.inProgress.auspiceData !== 0
export const selectIsInProgressRootSeq = (state: State) => state.algorithm.params.inProgress.rootSeq !== 0
export const selectIsInProgressQcSettings = (state: State) => state.algorithm.params.inProgress.qcRulesConfig !== 0
export const selectIsInProgressGeneMap = (state: State) => state.algorithm.params.inProgress.geneMap !== 0
export const selectIsInProgressPcrPrimers = (state: State) => state.algorithm.params.inProgress.pcrPrimers !== 0

export const selectCanRun = (state: State): boolean =>
  state.algorithm.status === AlgorithmGlobalStatus.idle ||
  state.algorithm.status === AlgorithmGlobalStatus.done ||
  state.algorithm.status === AlgorithmGlobalStatus.failed

export const selectCanDownload = (state: State): boolean =>
  state.algorithm.status === AlgorithmGlobalStatus.done &&
  state.algorithm.results !== undefined &&
  state.algorithm.results.length > 0 &&
  state.algorithm.treeStr !== undefined

export const selectOutputTree = (state: State): string | undefined => state.algorithm.treeStr
export const selectCladeNodeAttrKeys = (state: State): string[] => state.algorithm.cladeNodeAttrKeys

export const selectOutputSequences = (state: State) =>
  state.algorithm.results.map((result) => ({ seqName: result.seqName, query: result.query }))

export const selectOutputPeptides = (state: State) =>
  state.algorithm.results.map((result) => ({ seqName: result.seqName, queryPeptides: result.queryPeptides }))

export const selectExportParams = (state: State) => state.algorithm.exportParams

export const selectQueryStr = (state: State) => state.algorithm.params.strings.queryStr
export const selectQueryName = (state: State) => state.algorithm.params.strings.queryName
export const selectRefSeq = (state: State) => state.algorithm.params.strings.refStr
export const selectRefName = (state: State) => state.algorithm.params.strings.refName
export const selectGeneMapStr = (state: State) => state.algorithm.params.strings.geneMapStr
export const selectRefTreeStr = (state: State) => state.algorithm.params.strings.treeStr
export const selectPcrPrimersStr = (state: State) => state.algorithm.params.strings.pcrPrimerCsvRowsStr
export const selectQcConfigStr = (state: State) => state.algorithm.params.strings.qcConfigStr
export const selectVirusJsonStr = (state: State) => state.algorithm.params.strings.virusJsonStr

export const selectGeneMap = (state: State) => state.algorithm.params.final?.geneMap
export const selectGenomeSize = (state: State) => state.algorithm.params.final?.genomeSize

export const selectUrlParams = (state: State) => state.algorithm.params.urlParams

export function selectStatus(state: State) {
  const numThreads = selectNumThreads(state)
  const statusGlobal = state.algorithm.status
  const sequenceStatuses = state.algorithm.results.map(({ seqName, status }) => ({ seqName, status }))
  const hasFailures = state.algorithm.results.some(({ status }) => status === AlgorithmSequenceStatus.failed)

  const idlingPercent = 0
  const loadingDataPercent = 5
  const loadingDataDonePercent = 10
  const treeBuildPercent = 85
  const treeBuildDonePercent = 90
  const allDonePercent = 100

  let statusText = i18n.t('Idle')
  let failureText: string | undefined
  let percent = 0

  switch (statusGlobal) {
    case AlgorithmGlobalStatus.idle:
      {
        statusText = i18n.t('Idle')
        percent = idlingPercent
      }
      break

    case AlgorithmGlobalStatus.loadingData:
      {
        statusText = i18n.t('Loading data...')
        percent = loadingDataPercent
      }
      break

    case AlgorithmGlobalStatus.initWorkers:
      {
        statusText = i18n.t('Starting {{numWorkers}} threads...', { numWorkers: numThreads })
        percent = loadingDataDonePercent
      }
      break

    case AlgorithmGlobalStatus.started:
      {
        const total = sequenceStatuses.length
        const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.done).length
        const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.failed).length
        const done = succeeded + failed
        percent = loadingDataDonePercent + (done / total) * (treeBuildPercent - loadingDataDonePercent)
        statusText = i18n.t('Analysing sequences: Found: {{total}}. Analyzed: {{done}}', { done, total })
        if (failed > 0) {
          failureText = i18n.t('Failed: {{failed}}', { failed, total })
        }
      }
      break

    case AlgorithmGlobalStatus.buildingTree:
      {
        percent = treeBuildDonePercent
        statusText = i18n.t('Building tree')
      }
      break

    case AlgorithmGlobalStatus.done:
      {
        percent = allDonePercent
        const total = sequenceStatuses.length
        const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.done).length
        const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.failed).length
        statusText = i18n.t('Done. Total sequences: {{total}}. Succeeded: {{succeeded}}', { succeeded, total })
        if (failed > 0) {
          failureText = i18n.t('Failed: {{failed}}', { failed, total })
        }
      }
      break

    case AlgorithmGlobalStatus.failed:
      {
        failureText = i18n.t('Failed due to error.')
        percent = 100
      }
      break

    default:
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `This switch-case block should be exhaustive, but has reached the default case. The value was ${statusGlobal}. This is an internal error. Please report it to developers.`,
        )
      }
  }

  return { percent, statusText, failureText, hasFailures }
}
