import React, { useCallback, useMemo, useState } from 'react'
import { get } from 'lodash'
import styled, { useTheme } from 'styled-components'
import { useRecoilValue } from 'recoil'
import { Col, Row } from 'reactstrap'
import type { AaMotif, AaMotifsDesc, AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { InsertedFragmentTruncated } from 'src/components/Results/ListOfInsertions'
import { geneMapAtom } from 'src/state/results.state'

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
  const theme = useTheme()
  const geneMap = useRecoilValue(geneMapAtom)

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <Tr>
        <ThNormal className="text-center">{t('Gene')}</ThNormal>
        <ThNormal className="text-center">{t('Ref pos.')}</ThNormal>
        <ThFragment className="text-center">{t('Motif')}</ThFragment>
      </Tr>
    )

    const aaMotifsTruncated = motifs.slice(0, 20)

    const tbody = aaMotifsTruncated.map(({ gene, position, seq }) => {
      const geneObj = geneMap.find((geneObj) => geneObj.geneName === gene)
      const geneBg = geneObj?.color ?? theme.gray400
      const geneFg = theme.gray200
      return (
        <Tr key={`${gene}-${position}`}>
          <TdNormal>
            <GeneText $background={geneBg} $color={geneFg}>
              {gene}
            </GeneText>
          </TdNormal>
          <TdNormal className="text-center">{position + 1}</TdNormal>
          <TdFragment className="text-left">
            <InsertedFragmentTruncated insertion={seq} isAminoacid />
          </TdFragment>
        </Tr>
      )
    })

    if (aaMotifsTruncated.length < motifs.length) {
      tbody.push(
        <Tr key="trunc">
          <td colSpan={3} className="text-center">
            {'...truncated'}
          </td>
        </Tr>,
      )
    }

    return { thead, tbody }
  }, [geneMap, motifs, t, theme])

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
  min-width: 200px;
`

const Tr = styled.tr`
  background-color: ${(props) => props.theme.gray200};
  border: none;

  :nth-child(odd) {
    background-color: ${(props) => props.theme.gray100};
  }

  :last-child {
    border-radius: 3px;
  }
`

const ThNormal = styled.th`
  width: 100px;
  height: 26px;
  background-color: ${(props) => props.theme.gray700};
  color: ${(props) => props.theme.gray200};
  font-weight: bold;
`

const ThFragment = styled(ThNormal)`
  min-width: 200px;
`

const TdNormal = styled.td`
  min-width: 80px;
`

const TdFragment = styled(TdNormal)`
  min-width: 200px;
`

export const GeneText = styled.span<{ $background?: string; $color?: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$color ?? props.theme.gray100};
  font-weight: bold;
  border-radius: 3px;
`
