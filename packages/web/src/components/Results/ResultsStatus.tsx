import React from 'react'

import { Progress } from 'reactstrap'
import { connect } from 'react-redux'

import type { State } from 'src/state/reducer'
import type { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import { selectStatus } from 'src/state/algorithm/algorithm.selectors'

export interface SequenceStatus {
  seqName: string
  status: AnylysisStatus
}

export interface ResultsStatusProps {
  status: { percent: number; statusText: string }
}

const mapStateToProps = (state: State) => ({
  status: selectStatus(state),
})

const mapDispatchToProps = {}

export const ResultsStatus = connect(mapStateToProps, mapDispatchToProps)(ResultsStatusDisconnected)

export function ResultsStatusDisconnected({ status }: ResultsStatusProps) {
  const { percent, statusText } = status
  const color = percent === 100 ? 'transparent' : undefined
  return (
    <div>
      <div className="text-right">{statusText}</div>
      <Progress color={color} value={percent} />
    </div>
  )
}
