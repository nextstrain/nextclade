import React from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { Oval } from 'react-loader-spinner'

import type { State } from 'src/state/reducer'
import { selectStatus } from 'src/state/algorithm/algorithm.selectors'

const ResultsStatusWrapper = styled.div`
  height: 32px;
  margin: 0;
`

export interface ResultsStatusProps {
  status: { percent: number; statusText: string; failureText?: string; hasFailures: boolean }
}

const mapStateToProps = (state: State) => ({
  status: selectStatus(state),
})

const mapDispatchToProps = {}

export const ResultsStatus = connect(mapStateToProps, mapDispatchToProps)(ResultsStatusDisconnected)

export function ResultsStatusDisconnected({ status }: ResultsStatusProps) {
  const { statusText, failureText, percent } = status

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

  return (
    <ResultsStatusWrapper>
      {percent !== 100 && <Oval color="#222" width={24} height={24} />}
      <span className="ml-2">{text}</span>
    </ResultsStatusWrapper>
  )
}
