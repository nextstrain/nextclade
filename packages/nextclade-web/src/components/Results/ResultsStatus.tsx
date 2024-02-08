import React, { ReactNode, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { FaCheckSquare as CheckIcon } from 'react-icons/fa'
import { IoWarning as WarnIcon } from 'react-icons/io5'
import i18n from 'src/i18n/i18n'
import styled, { useTheme } from 'styled-components'
import { LoadingSpinner } from 'src/components/Loading/Loading'
import { Tooltip } from 'src/components/Results/Tooltip'
import { analysisResultStatusesAtom, analysisStatusGlobalAtom } from 'src/state/results.state'
import { numThreadsAtom } from 'src/state/settings.state'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/types'

const ResultsStatusWrapper = styled.div`
  display: flex;
  flex: 1;

  height: 37px;
  margin-left: 0.75rem;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;

  box-shadow: inset 0 0 10px 0 #0003;
  border: #0003 solid 1px;
  border-radius: 3px;
  padding: 0 0.5rem;

  vertical-align: middle;

  > span {
    line-height: 32px;
  }
`

const ResultsStatusText = styled.span`
  margin: auto 0;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`

const ResultsStatusSpinnerWrapper = styled.span`
  margin: auto 0;
`

export function ResultsStatus({ ...restProps }) {
  const theme = useTheme()

  const numThreads = useRecoilValue(numThreadsAtom)
  const statusGlobal = useRecoilValue(analysisStatusGlobalAtom)
  const analysisResultStatuses = useRecoilValue(analysisResultStatusesAtom)

  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { text, spinner } = useMemo(() => {
    const { statusText, failureText, hasFailures } = selectStatus(statusGlobal, analysisResultStatuses, numThreads)

    let text = <span>{statusText}</span>
    if (failureText) {
      text = (
        <>
          <span>{statusText}</span>
          <span>{'. '}</span>
          <span className="text-danger">{failureText}</span>
        </>
      )
    }

    let spinner: ReactNode = <LoadingSpinner size={24} />
    if (statusGlobal === AlgorithmGlobalStatus.done) {
      spinner = hasFailures ? (
        <WarnIcon size={28} color={theme.warning} />
      ) : (
        <CheckIcon size={28} color={theme.success} />
      )
    }
    return { text, spinner }
  }, [analysisResultStatuses, numThreads, statusGlobal, theme.success, theme.warning])

  if (statusGlobal === AlgorithmGlobalStatus.idle) {
    return null
  }

  return (
    <>
      <ResultsStatusWrapper id="results-status" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...restProps}>
        <ResultsStatusSpinnerWrapper>{spinner}</ResultsStatusSpinnerWrapper>
        <ResultsStatusText className="ml-2">{text}</ResultsStatusText>
      </ResultsStatusWrapper>
      <Tooltip target="results-status" isOpen={showTooltip} placement="bottom-start" fullWidth>
        {text}
      </Tooltip>
    </>
  )
}

export function selectStatus(
  statusGlobal: AlgorithmGlobalStatus,
  analysisResultStatuses: AlgorithmSequenceStatus[],
  numThreads: number,
) {
  const hasFailures = analysisResultStatuses.includes(AlgorithmSequenceStatus.failed)

  const idlingPercent = 0
  const loadingDataPercent = 5
  const loadingDataDonePercent = 10
  const treeBuildPercent = 85
  const treeBuildDonePercent = 90
  const allDonePercent = 100

  let statusText = i18n.t('Idle')
  let failureText: string | undefined
  let percent = 0

  /* eslint-disable no-lone-blocks */
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
        const total = analysisResultStatuses.length
        const succeeded = analysisResultStatuses.filter((status) => status === AlgorithmSequenceStatus.done).length
        const failed = analysisResultStatuses.filter((status) => status === AlgorithmSequenceStatus.failed).length
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
        const total = analysisResultStatuses.length
        const succeeded = analysisResultStatuses.filter((status) => status === AlgorithmSequenceStatus.done).length
        const failed = analysisResultStatuses.filter((status) => status === AlgorithmSequenceStatus.failed).length
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
          `This switch-case block should be exhaustive, but has reached the default case. The value was "${statusGlobal}". This is an internal error. Please report it to developers.`,
        )
      }
    /* eslint-enable no-lone-blocks */
  }

  return { percent, statusText, failureText, hasFailures }
}
