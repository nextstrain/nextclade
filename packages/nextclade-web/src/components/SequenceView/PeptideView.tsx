import React, { useCallback, useMemo, useState } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { Alert as ReactstrapAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { PeptideViewAbsolute } from 'src/components/SequenceView/PeptideViewAbsolute'
import { PeptideViewRelative } from 'src/components/SequenceView/PeptideViewRelative'
import styled from 'styled-components'
import type { AnalysisResult, PeptideWarning } from 'src/types'
import { cdsAtom, currentRefNodeNameAtom } from 'src/state/results.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getSafeId } from 'src/helpers/getSafeId'
import { WarningIcon } from 'src/components/Results/getStatusIconAndText'
import { Tooltip } from 'src/components/Results/Tooltip'
import { SequenceViewWrapper } from './SequenceViewStyles'

const MissingRow = styled.div`
  background-color: ${(props) => props.theme.gray650};
  color: ${(props) => props.theme.gray100};
  margin: auto;
  cursor: pointer;
  box-shadow: 2px 2px 5px #0005 inset;
`

const Alert = styled(ReactstrapAlert)`
  box-shadow: ${(props) => props.theme.shadows.slight};
  max-width: 400px;
`

export interface PeptideViewMissingProps {
  geneName: string
  reasons: PeptideWarning[]
}

export function PeptideViewMissing({ geneName, reasons }: PeptideViewMissingProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const id = getSafeId('sequence-label', { geneName })

  return (
    <MissingRow id={id} className="w-100 h-100 d-flex" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <span className="m-auto">{t('Gene "{{ geneName }}" is missing', { geneName })}</span>
      <Tooltip wide fullWidth target={id} isOpen={showTooltip} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <p>{t('This gene is missing due to the following errors during analysis: ')}</p>
        {reasons.map((warn) => (
          <Alert key={warn.cdsName} color="warning" fade={false} className="px-2 py-1 my-1">
            <WarningIcon />
            {warn.warning}
          </Alert>
        ))}
      </Tooltip>
    </MissingRow>
  )
}

export interface PeptideViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
  warnings?: PeptideWarning[]
  viewedGene: string
}

export function PeptideViewUnsized({ width, sequence, warnings, viewedGene }: PeptideViewProps) {
  const { t } = useTranslationSafe()
  const refNodeName = useRecoilValue(currentRefNodeNameAtom)
  const cds = useRecoilValue(cdsAtom(viewedGene))

  const view = useMemo(() => {
    if (!width) {
      return null
    }

    if (!cds) {
      return <>{t('{{cds}} {{geneName}} is missing in genome annotation', { cds: 'CDS', geneName: viewedGene })}</>
    }

    const warningsForThisGene = (warnings ?? []).filter((warn) => warn.cdsName === viewedGene)
    if (warningsForThisGene.length > 0) {
      return <PeptideViewMissing geneName={cds.name} reasons={warningsForThisGene} />
    }

    if (refNodeName === '_root') {
      return <PeptideViewAbsolute width={width} cds={cds} sequence={sequence} />
    }

    if (refNodeName === '_parent') {
      return <PeptideViewRelative width={width} cds={cds} sequence={sequence} refNodeName={refNodeName} />
    }

    return <PeptideViewRelative width={width} cds={cds} sequence={sequence} refNodeName={refNodeName} />
  }, [cds, refNodeName, sequence, t, viewedGene, warnings, width])

  return <SequenceViewWrapper>{view}</SequenceViewWrapper>
}

export const PeptideViewUnmemoed = withResizeDetector(PeptideViewUnsized)

export const PeptideView = React.memo(PeptideViewUnmemoed)
