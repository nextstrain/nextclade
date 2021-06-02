import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { AminoacidSubstitution } from 'src/algorithms/types'

import { formatAAMutation } from 'src/helpers/formatMutation'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { PeptideContext } from './PeptideContext'

export interface PeptideMarkerMutationProps extends SVGProps<SVGRectElement> {
  seqName: string
  aaSubstitution: AminoacidSubstitution
  pixelsPerAa: number
}

function PeptideMarkerMutationUnmemoed({
  seqName,
  aaSubstitution,
  pixelsPerAa,
  onClick,
  ...rest
}: PeptideMarkerMutationProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { codon, codonNucRange, queryContext, refContext, contextNucRange } = aaSubstitution
  const id = getSafeId('mutation-marker', { seqName, ...aaSubstitution })

  const mut = formatAAMutation(aaSubstitution)
  const fill = getAminoacidColor(aaSubstitution.queryAA)
  const nucRage = formatRange(codonNucRange.begin, codonNucRange.end)

  const x = codon * pixelsPerAa
  const width = Math.max(BASE_MIN_WIDTH_PX, pixelsPerAa)

  return (
    <rect
      id={id}
      fill={fill}
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
            <h6 className="my-0">{t('Aminoacid mutation')}</h6>
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

export const PeptideMarkerMutation = React.memo(PeptideMarkerMutationUnmemoed)
