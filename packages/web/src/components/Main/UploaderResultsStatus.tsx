import React, { useEffect, useState } from 'react'

import { delay } from 'lodash'

import { Progress, ProgressProps } from 'reactstrap'
import { connect } from 'react-redux'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { selectStatus } from 'src/state/algorithm/algorithm.selectors'

export function delayOpacity(percent: number, setOpacity: (opacity: number | undefined) => void) {
  let interval: number | undefined
  if (percent === 0 || percent === 100) {
    interval = delay(setOpacity, 1000, 0)
  } else {
    setOpacity(undefined)
  }

  return () => {
    interval && clearInterval(interval)
  }
}

export interface CustomProgressProps extends ProgressProps {
  opacity?: number
}

export const CustomProgress = styled(Progress)`
  position: relative;
  top: -5px;
  height: 5px;
  margin: 0 5px;
  opacity: ${(props: CustomProgressProps) => props.opacity};
  transition: opacity 1s ease-out;
  background-color: #adb5bd;
`

export interface SequenceStatus {
  seqName: string
  status: AlgorithmSequenceStatus
}

export interface UploaderResultsStatusProps {
  status: { percent: number; statusText: string }
}

const mapStateToProps = (state: State) => ({
  status: selectStatus(state),
})

const mapDispatchToProps = {}

export const UploaderResultsStatus = connect(mapStateToProps, mapDispatchToProps)(UploaderResultsStatusDisconnected)

export function UploaderResultsStatusDisconnected({ status }: UploaderResultsStatusProps) {
  const [opacity, setOpacity] = useState<number | undefined>(0)
  useEffect(() => delayOpacity(status.percent, setOpacity), [status.percent])
  return <CustomProgress opacity={opacity} value={status.percent} />
}
