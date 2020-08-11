import { isEmpty } from 'lodash'

import i18n from 'src/i18n/i18n'

import type { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'

export const selectParams = (state: State) => state.algorithm.params

export const selectResults = (state: State) => state.algorithm.results

export const selectTree = (state: State) => state.algorithm.tree

export const selectHasTree = (state: State) => !isEmpty(state.algorithm.tree)

export const selectIsDirty = (state: State): boolean => state.algorithm.isDirty

export const canExport = (state: State): boolean =>
  state.algorithm.results.length > 0 && state.algorithm.status === AlgorithmGlobalStatus.allDone

export function selectStatus(state: State) {
  const statusGlobal = state.algorithm.status
  const sequenceStatuses = state.algorithm.results.map(({ seqName, status }) => ({ seqName, status }))

  const parseDonePercent = 10
  let statusText = 'Idling'
  let failureText: string | undefined
  let percent = 0
  if (statusGlobal === AlgorithmGlobalStatus.parsingStarted) {
    statusText = i18n.t('Parsing...')
    percent = 3
  } else if (statusGlobal === AlgorithmGlobalStatus.parsingDone) {
    percent = parseDonePercent
    statusText = i18n.t('Parsing...')
  } else if (statusGlobal === AlgorithmGlobalStatus.analysisStarted) {
    const total = sequenceStatuses.length
    const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.analysisDone).length
    const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.analysisFailed).length
    const done = succeeded + failed
    percent = parseDonePercent + (done / total) * (100 - parseDonePercent)
    statusText = i18n.t('Analysing sequences: {{done}}/{{total}}', { done, total })
    if (failed > 0) {
      failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
    }
  } else if (statusGlobal === AlgorithmGlobalStatus.treeBuildStarted) {
    percent = 50
    statusText = i18n.t('Building the tree')
  } else if (statusGlobal === AlgorithmGlobalStatus.qcStarted) {
    const total = sequenceStatuses.length
    const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.qcDone).length
    const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.qcFailed).length
    const done = succeeded + failed
    percent = parseDonePercent + (done / total) * (100 - parseDonePercent)
    statusText = i18n.t('Analysing sequences: {{done}}/{{total}}', { done, total })
    if (failed > 0) {
      failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
    }
  } else if (statusGlobal === AlgorithmGlobalStatus.allDone) {
    percent = 100
    const total = sequenceStatuses.length
    const succeeded = sequenceStatuses.filter(
      ({ status }) => status === AlgorithmSequenceStatus.analysisDone || status === AlgorithmSequenceStatus.qcDone,
    ).length
    const failed = sequenceStatuses.filter(
      ({ status }) => status === AlgorithmSequenceStatus.analysisFailed || status === AlgorithmSequenceStatus.qcFailed,
    ).length
    statusText = i18n.t('Done. Total sequences: {{total}}. Succeeded: {{succeeded}}', { succeeded, total })
    if (failed > 0) {
      failureText = i18n.t('Failed: {{failed}}', { failed, total })
    }
  }

  return { percent, statusText, failureText }
}
