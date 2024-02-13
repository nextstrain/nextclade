import React, { useCallback, useMemo, useState } from 'react'
import { get } from 'lodash'
import styled, { useTheme } from 'styled-components'
import { useRecoilValue } from 'recoil'
import { Col, Row } from 'reactstrap'
import type { AaMotif, AaMotifChanges, AaMotifMutation, AaMotifsDesc, AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { useTranslationSafe, useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { TableSlim, TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { InsertedFragmentTruncated } from 'src/components/Results/ListOfInsertions'
import { cdsesAtom } from 'src/state/results.state'

export interface ColumnAaMotifsProps {
  analysisResult: AnalysisResult
  motifDesc: AaMotifsDesc
}

export function ColumnAaMotifs({ analysisResult, motifDesc }: ColumnAaMotifsProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, aaMotifsChanges } = analysisResult

  const id = useMemo(
    () =>
      getSafeId('col-aa-motif', {
        index,
        seqName,
        name: motifDesc.name,
      }),
    [index, motifDesc.name, seqName],
  )

  const motifs: AaMotifChanges | undefined = get(aaMotifsChanges, motifDesc.name)

  const columnValue = useMemo(() => {
    if (!motifs) {
      return null
    }
    return (
      <span>
        <ColoredText>{motifs.total}</ColoredText>
        <TextNarrow>
          {'('}
          <ColoredText $color={'#487921'}>+{motifs.gained.length}</ColoredText>
          <ColoredText $color={'#7f0d0d'}>-{motifs.lost.length}</ColoredText>
          <ColoredText> {motifs.ambiguous.length}</ColoredText>
          {')'}
        </TextNarrow>
      </span>
    )
  }, [motifs])

  const gained = useMemo(() => {
    if (!motifs) {
      return null
    }
    return (
      motifs.gained.length > 0 && (
        <div>
          <ColoredH6 $color={'#487921'} className="mb-0">
            {t('Gained: {{gained}}', { gained: motifs.gained.length })}
          </ColoredH6>
          <p className="my-0">
            <small>{t('Motifs which are not present in reference sequence, but appeared in query sequence')}</small>
          </p>
          <ListOfAaMotifMutations motifs={motifs.gained} />
        </div>
      )
    )
  }, [motifs, t])

  const lost = useMemo(() => {
    if (!motifs) {
      return null
    }
    return (
      motifs.lost.length > 0 && (
        <div>
          <ColoredH6 $color={'#7f0d0d'} className="mb-0">
            {t('Lost: {{lost}}', { lost: motifs.lost.length })}
          </ColoredH6>
          <p className="my-0">
            <small>{t('Motifs which are present in reference sequence, but disappeared in query sequence')}</small>
          </p>
          <ListOfAaMotifMutations motifs={motifs.lost} />
        </div>
      )
    )
  }, [motifs, t])

  const ambiguous = useMemo(() => {
    if (!motifs) {
      return null
    }
    return (
      motifs.ambiguous.length > 0 && (
        <div>
          <ColoredH6 className="mb-0">
            {t('Ambiguous: {{ambiguous}}', { ambiguous: motifs.ambiguous.length })}
          </ColoredH6>
          <p className="my-0">
            <small>
              {t('Motifs which are present in reference sequence, but contain ambiguity in query sequence')}
            </small>
          </p>
          <ListOfAaMotifMutations motifs={motifs.ambiguous} />
        </div>
      )
    )
  }, [motifs, t])

  const preserved = useMemo(() => {
    if (!motifs) {
      return null
    }

    return (
      motifs.preserved.length > 0 && (
        <div>
          <ColoredH6 className="mb-0">
            {t('Preserved: {{preserved}}', { preserved: motifs.preserved.length })}
          </ColoredH6>
          <p className="my-0">
            <small>{t('Motifs carried from reference sequence (sometimes mutated)')}</small>
          </p>
          <ListOfAaMotifMutations motifs={motifs.preserved} />
        </div>
      )
    )
  }, [motifs, t])

  if (!columnValue) {
    return null
  }

  return (
    <div id={id} className="w-100 text-center" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {columnValue}
      <Tooltip id={id} isOpen={showTooltip} target={id} wide fullWidth>
        <Row noGutters>
          <Col className="mb-0">
            <h5 className="my-0 font-weight-bold">{motifDesc.nameFriendly}</h5>
            <p>
              <small>{t('Note that motifs are detected after insertions are stripped.')}</small>
            </p>

            <h6 className="font-weight-bold">{t('Total: {{total}}', { total: motifs.total })}</h6>
            {gained}
            {lost}
            {ambiguous}
            {preserved}
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
  const cdses = useRecoilValue(cdsesAtom)

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <Tr>
        <ThNormal className="text-center">{t('Gene')}</ThNormal>
        <ThNormal className="text-center">{t('Ref pos.')}</ThNormal>
        <ThFragment className="text-center">{t('Motif')}</ThFragment>
      </Tr>
    )

    const aaMotifsTruncated = motifs.slice(0, 20)

    const tbody = aaMotifsTruncated.map(({ name, position, seq }) => {
      const cdsObj = cdses.find((cds) => cds.name === name)
      const bg = cdsObj?.color ?? theme.gray400
      const fg = theme.gray200
      return (
        <Tr key={`${name}-${position}`}>
          <TdNormal>
            <GeneText $background={bg} $color={fg}>
              {name}
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
  }, [cdses, motifs, t, theme.gray200, theme.gray400])

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

export interface ListOfAaMotifMutationsProps {
  motifs: AaMotifMutation[]
}

export function ListOfAaMotifMutations({ motifs }: ListOfAaMotifMutationsProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const cdses = useRecoilValue(cdsesAtom)

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <Tr>
        <ThNormal className="text-center">{t('Gene')}</ThNormal>
        <ThNormal className="text-center">{t('Ref pos.')}</ThNormal>
        <ThFragment className="text-center">{t('Motif')}</ThFragment>
      </Tr>
    )

    const aaMotifsTruncated = motifs.slice(0, 20)

    const tbody = aaMotifsTruncated.map(({ cds, position, refSeq, qrySeq }) => {
      const cdsObj = cdses.find((cds1) => cds1.name === cds)
      const bg = cdsObj?.color ?? theme.gray400
      const fg = theme.gray200
      return (
        <Tr key={`${cds}-${position}`}>
          <TdNormal>
            <GeneText $background={bg} $color={fg}>
              {cds}
            </GeneText>
          </TdNormal>
          <TdNormal className="text-center">{position + 1}</TdNormal>
          <TdFragment className="text-left">
            <MotifFragment refSeq={refSeq} qrySeq={qrySeq} />
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
  }, [cdses, motifs, t, theme.gray200, theme.gray400])

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

export interface MotifFragmentProps {
  refSeq: string
  qrySeq: string
}

export function MotifFragment({ refSeq, qrySeq }: MotifFragmentProps) {
  if (refSeq === qrySeq) {
    return <InsertedFragmentTruncated insertion={refSeq} isAminoacid />
  }

  return (
    <>
      <InsertedFragmentTruncated insertion={refSeq} isAminoacid />
      {' ⟶ ' /* eslint-disable-line only-ascii/only-ascii */}
      <InsertedFragmentTruncated insertion={qrySeq} isAminoacid />
    </>
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
  background-color: ${(props) => props.theme.gray600};
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
  color: ${(props) => props.$color};
  font-weight: bold;
  border-radius: 3px;
`

export const ColoredText = styled.span<{ $background?: string; $color?: string }>`
  padding: 1px 1px;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$color};
  border-radius: 3px;
  font-family: ${(props) => props.theme.font.monospace};
`

export const TextNarrow = styled.small`
  * {
    letter-spacing: -1px;
  }
`

export const ColoredH6 = styled.h6<{ $background?: string; $color?: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$color};
  border-radius: 3px;
  font-weight: bold;
`

export const TableFragmentComparison = styled(TableSlim)`
  & td {
    border: none;
  }

  margin: 0;
`
