import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { AminoacidDeletion } from 'src/algorithms/types'

import { AMINOACID_GAP_COLOR } from 'src/helpers/getAminoacidColor'
import { formatAADeletion } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

import { Tooltip } from 'src/components/Results/Tooltip'
import { PeptideContext } from './PeptideContext'

export interface PeptideMarkerGapProps extends SVGProps<SVGRectElement> {
  seqName: string
  aaDeletion: AminoacidDeletion
  pixelsPerAa: number
}

function PeptideMarkerGapUnmemoed({ seqName, aaDeletion, pixelsPerAa, onClick, ...rest }: PeptideMarkerGapProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { codon, codonNucRange, queryContext, refContext, contextNucRange } = aaDeletion
  const id = getSafeId('mutation-marker', { seqName, ...aaDeletion })

  const mut = formatAADeletion(aaDeletion)
  const nucRage = formatRange(codonNucRange.begin, codonNucRange.end)

  const x = codon * pixelsPerAa
  const width = Math.max(BASE_MIN_WIDTH_PX, pixelsPerAa)

  return (
    <rect
      id={id}
      fill={AMINOACID_GAP_COLOR}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip} wide>
        <Row>
          <Col>
            <h5>{seqName}</h5>
          </Col>
        </Row>

        <Row className="mb-2">
          <Col>
            <h6 className="my-0">{t('Aminoacid deletion')}</h6>
          </Col>
          <Col>
            <h6 className="my-0">{mut}</h6>
          </Col>
        </Row>

        <Row className="mb-2">
          <Col>{t('Codon nucleotide range')}</Col>
          <Col>
            <pre className="my-0">{nucRage}</pre>
          </Col>
        </Row>

        <PeptideContext queryContext={queryContext} refContext={refContext} contextNucRange={contextNucRange} />
      </Tooltip>
    </rect>
  )
}

export const PeptideMarkerGap = React.memo(PeptideMarkerGapUnmemoed)
