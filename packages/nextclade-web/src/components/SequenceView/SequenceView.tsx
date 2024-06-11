import React, { useMemo } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue } from 'recoil'
import type { AnalysisResult } from 'src/types'
import { currentRefNodeNameAtom } from 'src/state/results.state'
import { SequenceViewAbsolute } from './SequenceViewAbsolute'
import { SequenceViewRelative } from './SequenceViewRelative'
import { SequenceViewWrapper } from './SequenceViewStyles'

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

  return <SequenceViewWrapper>{view}</SequenceViewWrapper>
}

export const SequenceViewUnmemoed = withResizeDetector(SequenceViewUnsized)

export const SequenceView = React.memo(SequenceViewUnmemoed)
