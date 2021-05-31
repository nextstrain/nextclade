/* eslint-disable no-lone-blocks */
import i18n from 'src/i18n/i18n'

import type { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'

export const selectParams = (state: State) => state.algorithm.params

export const selectResults = (state: State) => state.algorithm.results

export const selectResultsArray = (state: State) => state.algorithm.results.map((result) => result.result)

export const selectIsDirty = (state: State): boolean => state.algorithm.isDirty

export const selectCanExport = (state: State): boolean => state.algorithm.status === AlgorithmGlobalStatus.done

export const selectOutputTree = (state: State): string | undefined => state.algorithm.outputTree

export const selectQueryStr = (state: State) => state.algorithm.params.strings.queryStr
export const selectRefSeq = (state: State) => state.algorithm.params.strings.refStr
export const selectGeneMapStr = (state: State) => state.algorithm.params.strings.geneMapStr
export const selectRefTreeStr = (state: State) => state.algorithm.params.strings.treeStr
export const selectPcrPrimersStr = (state: State) => state.algorithm.params.strings.pcrPrimerCsvRowsStr
export const selectQcConfigStr = (state: State) => state.algorithm.params.strings.qcConfigStr

export const selectGeneMap = (state: State) => state.algorithm.params.final?.geneMap
export const selectGenomeSize = (state: State) => state.algorithm.params.final?.genomeSize

export function selectStatus(state: State) {
  const statusGlobal = state.algorithm.status
  const sequenceStatuses = state.algorithm.results.map(({ seqName, status }) => ({ seqName, status }))

  // We want to report failure state even when a particular progress status does not have failure text
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
        statusText = i18n.t('Starting WebWorkers...')
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
        statusText = i18n.t('Analysing sequences: {{done}}/{{total}}', { done, total })
        if (failed > 0) {
          failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
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

    default:
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          'developer error: this switch-case block should be exhaustive, but has reached the default case',
        )
      }
  }

  return { percent, statusText, failureText, hasFailures }
}
