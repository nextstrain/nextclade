import React, { useMemo } from 'react'
import { useResizeDetector, Dimensions } from 'react-resize-detector'
import type { StrictOmit } from 'ts-essentials'
import { useRecoilValue } from 'recoil'
import { REF_NODE_ROOT } from 'src/constants'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import type { AnalysisResult } from 'src/types'
import { currentRefNodeNameAtom } from 'src/state/results.state'
import { SequenceViewAbsolute } from './SequenceViewAbsolute'
import { SequenceViewRelative } from './SequenceViewRelative'
import { SequenceViewWrapper } from './SequenceViewStyles'

export interface SequenceViewProps extends Dimensions {
  sequence: AnalysisResult
}

function SequenceViewUnsized({ sequence, width }: { sequence: AnalysisResult; width?: number }) {
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const refNodeName = useRecoilValue(currentRefNodeNameAtom({ datasetName })) ?? REF_NODE_ROOT

  const view = useMemo(() => {
    if (!width) {
      return null
    }
    if (refNodeName === REF_NODE_ROOT) {
      return <SequenceViewAbsolute sequence={sequence} width={width} />
    }
    return <SequenceViewRelative sequence={sequence} width={width} refNodeName={refNodeName} />
  }, [refNodeName, sequence, width])

  return <SequenceViewWrapper>{view}</SequenceViewWrapper>
}

export function SequenceView({ sequence }: StrictOmit<SequenceViewProps, 'width' | 'height'>) {
  const { width } = useResizeDetector({ handleWidth: true })
  return <SequenceViewUnsized sequence={sequence} width={width} />
}
