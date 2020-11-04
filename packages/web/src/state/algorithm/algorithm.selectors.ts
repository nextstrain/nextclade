/* eslint-disable no-lone-blocks */
import i18n from 'src/i18n/i18n'

import type { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'

export const selectParams = (state: State) => state.algorithm.params

export const selectResults = (state: State) => state.algorithm.results

export const selectResultsArray = (state: State) => state.algorithm.results.map((result) => result.result)

export const selectIsDirty = (state: State): boolean => state.algorithm.isDirty

export const selectCanExport = (state: State): boolean => state.algorithm.status === AlgorithmGlobalStatus.allDone

export const selectOutputTree = (state: State): string | undefined => state.algorithm.outputTree

export function selectStatus(state: State) {
  const statusGlobal = state.algorithm.status
  const sequenceStatuses = state.algorithm.results.map(({ seqName, status }) => ({ seqName, status }))

  // We want to report failure state even when a particular progress status does not have failure text
  const hasFailures = state.algorithm.results.some(({ status }) => status === AlgorithmSequenceStatus.analysisFailed)

  const idlingPercent = 0
  const parseStartedPercent = 5
  const parseDonePercent = 10
  const treeBuildPercent = 85
  const assignCladesPercent = 90
  const treeFinalizationPercent = 95
  const allDonePercent = 100

  let statusText = 'Idling'
  let failureText: string | undefined
  let percent = 0

  switch (statusGlobal) {
    case AlgorithmGlobalStatus.idling:
      {
        statusText = i18n.t('Idling')
        percent = idlingPercent
      }
      break

    case AlgorithmGlobalStatus.started:
      {
        statusText = i18n.t('Parsing...')
        percent = parseStartedPercent
      }
      break

    case AlgorithmGlobalStatus.parsing:
      {
        percent = parseDonePercent
        statusText = i18n.t('Parsing...')
      }
      break

    case AlgorithmGlobalStatus.analysis:
      {
        const total = sequenceStatuses.length
        const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.analysisDone)
          .length
        const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.analysisFailed).length
        const done = succeeded + failed
        percent = parseDonePercent + (done / total) * (treeBuildPercent - parseDonePercent)
        statusText = i18n.t('Analysing sequences: {{done}}/{{total}}', { done, total })
        if (failed > 0) {
          failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
        }
      }
      break

    case AlgorithmGlobalStatus.treeBuild:
      {
        percent = treeBuildPercent
        statusText = i18n.t('Finding nearest tree nodes')
      }
      break

    case AlgorithmGlobalStatus.assignClades:
      {
        percent = assignCladesPercent
        statusText = i18n.t('Assigning clades')
      }
      break

    case AlgorithmGlobalStatus.qc:
      {
        const total = sequenceStatuses.length
        const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.qcDone).length
        const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.qcFailed).length
        const done = succeeded + failed
        percent = assignCladesPercent + (done / total) * (treeFinalizationPercent - assignCladesPercent)
        statusText = i18n.t('Assessing sequence quality: {{done}}/{{total}}', { done, total })
        if (failed > 0) {
          failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
        }
      }
      break

    case AlgorithmGlobalStatus.treeFinalization:
      {
        percent = treeFinalizationPercent
        statusText = i18n.t('Attaching new tree nodes')
      }
      break

    case AlgorithmGlobalStatus.allDone:
      {
        percent = allDonePercent
        const total = sequenceStatuses.length
        const succeeded = sequenceStatuses.filter(
          ({ status }) => status === AlgorithmSequenceStatus.analysisDone || status === AlgorithmSequenceStatus.qcDone,
        ).length
        const failed = sequenceStatuses.filter(
          ({ status }) =>
            status === AlgorithmSequenceStatus.analysisFailed || status === AlgorithmSequenceStatus.qcFailed,
        ).length
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
