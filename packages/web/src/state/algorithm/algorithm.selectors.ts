import i18n from 'src/i18n/i18n'

import type { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'

export const selectParams = (state: State) => state.algorithm.params

export const selectResults = (state: State) => state.algorithm.results

export const selectIsDirty = (state: State): boolean => state.algorithm.isDirty

export const selectCanExport = (state: State): boolean =>
  state.algorithm.results.length > 0 && state.algorithm.status === AlgorithmGlobalStatus.allDone

export function selectStatus(state: State) {
  const statusGlobal = state.algorithm.status
  const sequenceStatuses = state.algorithm.results.map(({ seqName, status }) => ({ seqName, status }))

  const parseStartedPercent = 1
  const parseDonePercent = 10
  const treeBuildPercent = 50
  const assignCladesPercent = 55
  const treeFinalizationPercent = 90
  const allDonePercent = 100

  let statusText = 'Idling'
  let failureText: string | undefined
  let percent = 0
  if (statusGlobal === AlgorithmGlobalStatus.started) {
    statusText = i18n.t('Parsing...')
    percent = parseStartedPercent
  } else if (statusGlobal === AlgorithmGlobalStatus.parsing) {
    percent = parseDonePercent
    statusText = i18n.t('Parsing...')
  } else if (statusGlobal === AlgorithmGlobalStatus.analysis) {
    const total = sequenceStatuses.length
    const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.analysisDone).length
    const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.analysisFailed).length
    const done = succeeded + failed
    percent = parseDonePercent + (done / total) * (treeBuildPercent - parseDonePercent)
    statusText = i18n.t('Analysing sequences: {{done}}/{{total}}', { done, total })
    if (failed > 0) {
      failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
    }
  } else if (statusGlobal === AlgorithmGlobalStatus.treeBuild) {
    percent = treeBuildPercent
    statusText = i18n.t('Finding nearest tree nodes')
  } else if (statusGlobal === AlgorithmGlobalStatus.assignClades) {
    percent = assignCladesPercent
    statusText = i18n.t('Assigning clades')
  } else if (statusGlobal === AlgorithmGlobalStatus.qc) {
    const total = sequenceStatuses.length
    const succeeded = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.qcDone).length
    const failed = sequenceStatuses.filter(({ status }) => status === AlgorithmSequenceStatus.qcFailed).length
    const done = succeeded + failed
    percent = assignCladesPercent + (done / total) * (treeFinalizationPercent - assignCladesPercent)
    statusText = i18n.t('Assessing sequence quality: {{done}}/{{total}}', { done, total })
    if (failed > 0) {
      failureText = i18n.t('Failed: {{failed}}/{{total}}', { failed, total })
    }
  } else if (statusGlobal === AlgorithmGlobalStatus.treeFinalization) {
    percent = treeFinalizationPercent
    statusText = i18n.t('Attaching new tree nodes')
  } else if (statusGlobal === AlgorithmGlobalStatus.allDone) {
    percent = allDonePercent
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
