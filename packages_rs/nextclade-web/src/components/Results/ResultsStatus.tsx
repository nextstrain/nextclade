import React, { ReactNode, useMemo } from 'react'
import { Oval } from 'react-loader-spinner'

import { useRecoilValue } from 'recoil'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/types'
import i18n from 'src/i18n/i18n'
import { analysisResultStatusesAtom, analysisStatusGlobalAtom } from 'src/state/results.state'
import { numThreadsAtom } from 'src/state/settings.state'
import styled from 'styled-components'

const ResultsStatusWrapper = styled.div`
  display: flex;
  height: 32px;
  margin: 0;

  > span {
    line-height: 32px;
  }
`

export function ResultsStatus() {
  const numThreads = useRecoilValue(numThreadsAtom)
  const statusGlobal = useRecoilValue(analysisStatusGlobalAtom)
  const analysisResultStatuses = useRecoilValue(analysisResultStatusesAtom)

  const { text, spinner } = useMemo(() => {
    const { statusText, failureText, percent } = selectStatus(statusGlobal, analysisResultStatuses, numThreads)

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

    let spinner: ReactNode = <Oval color="#222" width={24} height={24} />
    if (percent === 100) {
      spinner = null
    }

    return { text, spinner }
  }, [analysisResultStatuses, numThreads, statusGlobal])

  return (
    <ResultsStatusWrapper>
      <span>{spinner}</span>
      <span className="ml-2">{text}</span>
    </ResultsStatusWrapper>
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
