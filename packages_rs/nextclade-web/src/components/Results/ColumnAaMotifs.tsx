import React, { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'

import type { AaMotif, AaMotifsDesc, AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Col, Row } from 'reactstrap'
import { get } from 'lodash'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { InsertedFragmentTruncated } from 'src/components/Results/ListOfInsertions'

export interface ColumnAaMotifsProps {
  analysisResult: AnalysisResult
  motifDesc: AaMotifsDesc
}

export function ColumnAaMotifs({ analysisResult, motifDesc }: ColumnAaMotifsProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, aaMotifs } = analysisResult
  const id = useMemo(
    () =>
      getSafeId('col-aa-motif', {
        index,
        seqName,
        name: motifDesc.name,
      }),
    [index, motifDesc.name, seqName],
  )

  const motifs = get(aaMotifs, motifDesc.name)

  if (!motifs) {
    return null
  }

  return (
    <div id={id} className="w-100 text-center" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {motifs.length}
      <Tooltip id={id} isOpen={showTooltip} target={id} wide fullWidth>
        <Row noGutters>
          <Col>
            <h6>{motifDesc.nameFriendly}</h6>
            <ListOfAaMotifs motifs={motifs} />
          </Col>
        </Row>
      </Tooltip>
    </div>
  )
}

export interface ListOfAaMotifsProps {
  motifs: AaMotif[]
}

export function ListOfAaMotifs({ motifs }: ListOfAaMotifsProps) {
  const { t } = useTranslation()

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <tr>
        <ThNormal className="text-center">{t('Gene')}</ThNormal>
        <ThNormal className="text-center">{t('Ref pos.')}</ThNormal>
        <ThFragment className="text-center">{t('Motif')}</ThFragment>
      </tr>
    )

    const aaMotifsTruncated = motifs.slice(0, 20)
    const tbody = aaMotifsTruncated.map(({ gene, position, seq }) => (
      <tr key={`${gene}-${position}`}>
        <TdNormal className="text-center">{gene}</TdNormal>
        <TdNormal className="text-center">{position + 1}</TdNormal>
        <TdFragment className="text-left">
          <InsertedFragmentTruncated insertion={seq} isAminoacid />
        </TdFragment>
      </tr>
    ))

    if (aaMotifsTruncated.length < motifs.length) {
      tbody.push(
        <tr key="trunc">
          <td colSpan={3} className="text-center">
            {'...truncated'}
          </td>
        </tr>,
      )
    }

    return { thead, tbody }
  }, [motifs, t])

  if (motifs.length === 0) {
    return null
  }

  return (
    <AaMotifsTable>
      <thead>{thead}</thead>
      <tbody>{tbody}</tbody>
    </AaMotifsTable>
  )
}

const AaMotifsTable = styled(TableSlimWithBorders)`
  min-width: 400px;
`

const ThNormal = styled.th`
  width: 100px;
`

const ThFragment = styled.th`
  min-width: 200px;
`

const TdNormal = styled.td`
  min-width: 80px;
`

const TdFragment = styled.td`
  min-width: 200px;
`
