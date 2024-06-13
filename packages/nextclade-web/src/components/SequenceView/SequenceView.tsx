import React, { useMemo } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue } from 'recoil'
import { REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
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

    if (refNodeName === REF_NODE_ROOT) {
      return <SequenceViewAbsolute sequence={sequence} width={width} />
    }

    if (refNodeName === REF_NODE_PARENT) {
      return <SequenceViewRelative sequence={sequence} width={width} refNodeName={refNodeName} />
    }

    return <SequenceViewRelative sequence={sequence} width={width} refNodeName={refNodeName} />
  }, [refNodeName, sequence, width])

  return <SequenceViewWrapper>{view}</SequenceViewWrapper>
}

export const SequenceViewUnmemoed = withResizeDetector(SequenceViewUnsized)

export const SequenceView = React.memo(SequenceViewUnmemoed)
