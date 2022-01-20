import React, { useMemo, useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfInsertionsNuc, ListOfInsertionsAa } from 'src/components/Results/ListOfInsertions'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Col, Row } from 'reactstrap'

export interface ColumnInsertionsProps {
  sequence: AnalysisResult
}

export function ColumnInsertions({ sequence }: ColumnInsertionsProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, insertions, totalInsertions, aaInsertions, totalAminoacidInsertions } = sequence
  const id = getSafeId('col-insertions', { seqName, insertions })

  const nucTitle = useMemo(() => t('Nucleotide insertions ({{n}})', { n: insertions.length }), [insertions.length, t])
  const aaTitle = useMemo(() => t('Aminoacid insertions ({{n}})', { n: aaInsertions.length }), [aaInsertions.length, t])

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalInsertions}
      <Tooltip id={id} isOpen={showTooltip} target={id} wide fullWidth>
        <Row noGutters>
          <Col>
            <h6>{nucTitle}</h6>
            <ListOfInsertionsNuc insertions={insertions} totalInsertions={totalInsertions} />
          </Col>
        </Row>

        <Row noGutters>
          <Col>
            <h6>{aaTitle}</h6>
            <ListOfInsertionsAa insertions={aaInsertions} totalInsertions={totalAminoacidInsertions} isAminoacid />
          </Col>
        </Row>
      </Tooltip>
    </div>
  )
}
