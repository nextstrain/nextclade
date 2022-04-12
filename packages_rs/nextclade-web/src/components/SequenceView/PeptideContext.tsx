import React, { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'
import { Table as ReactstrapTable } from 'reactstrap'

import { safeZip, safeZip3 } from 'src/helpers/safeZip'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AminoacidChange, AminoacidChangesGroup } from 'src/components/SequenceView/groupAdjacentAminoacidChanges'
import { first, last } from 'lodash'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { Aminoacid, Nucleotide } from 'src/algorithms/types'

import { desaturate, lighten } from 'polished'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getTextColor } from 'src/helpers/getTextColor'

const pastel = (c: string) => lighten(0.25)(desaturate(0.33)(c))

export const Table = styled(ReactstrapTable)<{ $width: number }>`
  table-layout: fixed;
  text-align: center;
  font-size: 0.8rem;
  width: ${(props) => props.$width}px;

  & td {
    padding: 0;
    margin: 0;
  }
`

export const TrName = styled.tr``

export const TdName = styled.td`
  width: 80px;
  height: 20px;
  text-align: left;
`

export const TableNuc = styled(ReactstrapTable)`
  table-layout: fixed;
  width: 100%;
`

export const TableBodyNuc = styled.tbody`
  padding: 0;
  margin: 0;
`

export const TrNuc = styled.tr`
  padding: 10px;
  padding: 0;
  margin: 0;
`

export const TdNuc = styled.td<{ $color?: string; $shouldHighlight?: boolean }>`
  width: 20px;
  height: 20px;
  background: ${(props) => (props.$shouldHighlight ? props.$color : '#efefef')};
  padding: 0;
  margin: 0;
`

export const TdAa = styled.td<{ $color?: string; $background?: string }>`
  width: 20px;
  height: 20px;
  background: ${(props) => props.$background ?? '#efefef'};
  padding: 0;
  margin: 0;

  * {
    color: ${(props) => props.$color};
  }
`

export const TdAxis = styled.td`
  text-align: left;
  width: 20px;
  height: 20px;
  background: #efefef;
`

export const NucleotideText = styled.pre<{ $shouldHighlight?: boolean }>`
  display: inline;
  font-size: 0.7rem;
  padding: 0;
  margin: 0;
`

export const NucleotidePositionText = styled.pre`
  display: inline;
  font-size: 0.6rem;
  padding: 0;
  margin: 0;
`

export const AminoacidText = styled.pre`
  display: inline;
  font-size: 0.7rem;
  padding: 0;
  margin: 0;
`

export const AminoacidPositionText = styled.pre`
  display: inline;
  font-size: 0.7rem;
  padding: 0;
  margin: 0;
`

export interface PeptideContextAminoacidProps {
  aa?: Aminoacid
}

export function PeptideContextAminoacid({ aa }: PeptideContextAminoacidProps) {
  const theme = useTheme()

  const { color, background } = useMemo(() => {
    if (aa) {
      const background = getAminoacidColor(aa)
      const color = getTextColor(theme, background)
      return { color, background }
    }
    return {}
  }, [aa, theme])

  return (
    <TdAa colSpan={3} $color={color} $background={background}>
      <AminoacidText>{aa}</AminoacidText>
    </TdAa>
  )
}

export interface PeptideContextNucleotideProps {
  nuc: string
  shouldHighlight?: boolean
}

export function PeptideContextNucleotide({ nuc, shouldHighlight }: PeptideContextNucleotideProps) {
  const color = useMemo(() => pastel(getNucleotideColor(nuc as Nucleotide)), [nuc])
  return (
    <TdNuc $color={color} $shouldHighlight={shouldHighlight}>
      <NucleotideText $shouldHighlight={shouldHighlight}>{nuc}</NucleotideText>
    </TdNuc>
  )
}

export interface PeptideContextCodon {
  refCodon: string
  queryCodon: string
  change?: AminoacidChange
  codon?: number
  nucBegin?: number
}

export function PeptideContextCodon({ refCodon, queryCodon, change, codon, nucBegin }: PeptideContextCodon) {
  const refAA = change?.refAA
  const queryAA = change?.queryAA

  const highlight: boolean[] = safeZip(refCodon.split(''), queryCodon.split('')).map(([ref, query]) => ref !== query)

  return (
    <td>
      <TableNuc>
        <TableBodyNuc>
          <TrNuc>
            <TdNuc colSpan={3}>
              <AminoacidPositionText>{codon && codon + 1}</AminoacidPositionText>
            </TdNuc>
          </TrNuc>

          <TrNuc>
            <PeptideContextAminoacid aa={refAA} />
          </TrNuc>

          <TrNuc>
            {refCodon.split('').map((nuc, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <PeptideContextNucleotide key={`${nuc}-${i}`} nuc={nuc} />
            ))}
          </TrNuc>

          <TrNuc>
            {queryCodon.split('').map((nuc, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <PeptideContextNucleotide key={`${nuc}-${i}`} nuc={nuc} shouldHighlight={highlight[i]} />
            ))}
          </TrNuc>

          <TrNuc>
            <PeptideContextAminoacid aa={queryAA} />
          </TrNuc>

          <TrNuc>
            <TdAxis colSpan={3}>
              <NucleotidePositionText>{nucBegin && nucBegin + 1}</NucleotidePositionText>
            </TdAxis>
          </TrNuc>
        </TableBodyNuc>
      </TableNuc>
    </td>
  )
}

export function renderCodons([change, refCodon, queryCodon]: [AminoacidChange, string, string]) {
  return (
    <PeptideContextCodon
      key={change.codon}
      refCodon={refCodon}
      queryCodon={queryCodon}
      change={change}
      codon={change.codon}
      nucBegin={change.codonNucRange.begin}
    />
  )
}

export function PeptideContextEllipsis() {
  return (
    <td>
      <TableNuc>
        <TableBodyNuc>
          {Array(6)
            .fill(0)
            .map((_0, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <TrNuc key={i}>
                <TdNuc colSpan={3}>{'...'}</TdNuc>
              </TrNuc>
            ))}
        </TableBodyNuc>
      </TableNuc>
    </td>
  )
}

export interface PeptideContextProps {
  group: AminoacidChangesGroup
}

export function PeptideContext({ group }: PeptideContextProps) {
  const { t } = useTranslationSafe()

  const { changes, contextNucRange, codonAaRange, refContext, queryContext } = group
  const refCodons = refContext.match(/.{1,3}/g)
  const queryCodons = queryContext.match(/.{1,3}/g)

  const firstChange = first(queryCodons)
  const lastChange = last(refCodons)

  const firstRefCodon = first(refCodons)
  const lastRefCodon = last(refCodons)

  const firstQryCodon = first(queryCodons)
  const lastQryCodon = last(queryCodons)

  if (
    !refCodons ||
    !queryCodons ||
    !firstChange ||
    !lastChange ||
    !firstRefCodon ||
    !firstQryCodon ||
    !lastRefCodon ||
    !lastQryCodon
  ) {
    return null
  }

  const changesAndCodons = safeZip3(changes, refCodons.slice(1, -1), queryCodons.slice(1, -1))

  let itemsBegin = changesAndCodons
  let itemsEnd: typeof changesAndCodons = []
  if (changesAndCodons.length > 6) {
    itemsBegin = changesAndCodons.slice(0, 3)
    itemsEnd = changesAndCodons.slice(-3)
  }

  const width = (itemsBegin.length + itemsEnd.length + 2) * 80 + 80

  return (
    <Table borderless className="mb-1 mx-2" $width={width}>
      <tbody>
        <tr>
          <td>
            <TableNuc>
              <tbody>
                <TrName>
                  <TdName>{t('Codon')}</TdName>
                </TrName>
                <TrName>
                  <TdName>{t('Ref. AA')}</TdName>
                </TrName>
                <TrName>
                  <TdName>{t('Ref.')}</TdName>
                </TrName>
                <TrName>
                  <TdName>{t('Query')}</TdName>
                </TrName>
                <TrName>
                  <TdName>{t('Query AA')}</TdName>
                </TrName>
                <TrName>
                  <TdName>{t('1st nuc.')}</TdName>
                </TrName>
              </tbody>
            </TableNuc>
          </td>

          <PeptideContextCodon
            refCodon={firstRefCodon}
            queryCodon={firstQryCodon}
            codon={codonAaRange.begin - 1}
            nucBegin={contextNucRange.begin}
          />

          {itemsBegin.map(renderCodons)}
          {itemsEnd.length > 0 && <PeptideContextEllipsis />}
          {itemsEnd.length > 0 && itemsEnd.map(renderCodons)}

          <PeptideContextCodon
            refCodon={lastRefCodon}
            queryCodon={lastQryCodon}
            codon={codonAaRange.end}
            nucBegin={contextNucRange.end - 3}
          />
        </tr>
      </tbody>
    </Table>
  )
}
