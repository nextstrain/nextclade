import React from 'react'

import { connect } from 'react-redux'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'

import type { State } from 'src/state/reducer'
import type { AnalysisResult, Gene } from 'src/algorithms/types'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import { PeptideMarkerGap } from './PeptideMarkerGap'
import { PeptideMarkerMutation } from './PeptideMarkerMutation'
import { SequenceViewWrapper, SequenceViewSVG } from './SequenceView'

export interface PeptideViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
  geneMap?: Gene[]
  viewedGene: string
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})
const mapDispatchToProps = {}

export const PeptideViewUnsized = connect(mapStateToProps, mapDispatchToProps)(PeptideViewUnsizedDisconnected)

export function PeptideViewUnsizedDisconnected({ width, sequence, geneMap, viewedGene }: PeptideViewProps) {
  const { t } = useTranslationSafe()

  if (!width || !geneMap) {
    return (
      <SequenceViewWrapper>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  const gene = geneMap.find((gene) => gene.geneName === viewedGene)
  if (!gene) {
    return (
      <SequenceViewWrapper>
        {t('Gene {{geneName}} is missing in gene map', { geneName: viewedGene })}
      </SequenceViewWrapper>
    )
  }

  const aaSubstitutions = sequence.aaSubstitutions.filter((aaSub) => aaSub.gene === viewedGene)
  const aaDeletions = sequence.aaDeletions.filter((aaSub) => aaSub.gene === viewedGene)

  const pixelsPerAa = width / Math.round(gene.length / 3)

  const mutationViews = aaSubstitutions.map((aaSubstitution) => {
    return (
      <PeptideMarkerMutation
        key={aaSubstitution.codon}
        seqName={sequence.seqName}
        aaSubstitution={aaSubstitution}
        pixelsPerAa={pixelsPerAa}
      />
    )
  })

  const deletionViews = aaDeletions.map((aaDeletion) => {
    return (
      <PeptideMarkerGap
        key={aaDeletion.codon}
        seqName={sequence.seqName}
        aaDeletion={aaDeletion}
        pixelsPerAa={pixelsPerAa}
      />
    )
  })

  return (
    <SequenceViewWrapper>
      <SequenceViewSVG viewBox={`0 0 ${width} 10`}>
        <rect fill="transparent" x={0} y={-10} width={gene.length} height="30" />
        {mutationViews}
        {deletionViews}
      </SequenceViewSVG>
    </SequenceViewWrapper>
  )
}

export const PeptideViewUnmemoed = withResizeDetector(PeptideViewUnsized)

export const PeptideView = React.memo(PeptideViewUnmemoed)
