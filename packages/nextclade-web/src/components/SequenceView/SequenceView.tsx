import React, { useMemo } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import type { AnalysisResult } from 'src/types'
import { currentRefNodeNameAtom } from 'src/state/results.state'
import { SequenceViewAbsolute } from './SequenceViewAbsolute'
import { SequenceViewRelative } from './SequenceViewRelative'

export const SequenceViewWrapper = styled.div`
  display: flex;
  width: 100%;
  height: 30px;
  vertical-align: middle;
  margin: 0;
  padding: 0;
`

export const SequenceViewSVG = styled.svg`
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
`

export interface SequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
}

export function SequenceViewUnsized({ sequence, width }: SequenceViewProps) {
  const refNodeName = useRecoilValue(currentRefNodeNameAtom)

  const view = useMemo(() => {
    if (!width) {
      return null
    }

    if (refNodeName === '_root') {
      return <SequenceViewAbsolute sequence={sequence} width={width} />
    }

    if (refNodeName === '_parent') {
      return <SequenceViewRelative sequence={sequence} width={width} refNodeName={refNodeName} />
    }

    return <SequenceViewRelative sequence={sequence} width={width} refNodeName={refNodeName} />
  }, [refNodeName, sequence, width])

  return (
    <SequenceViewWrapper>
      <SequenceViewSVG viewBox={`0 0 ${width} 10`}>{view}</SequenceViewSVG>
    </SequenceViewWrapper>
  )
}

export const SequenceViewUnmemoed = withResizeDetector(SequenceViewUnsized)

export const SequenceView = React.memo(SequenceViewUnmemoed)
