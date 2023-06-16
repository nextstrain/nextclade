import React, { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'
import { Table as ReactstrapTable } from 'reactstrap'

import type { Aminoacid, AminoacidChange, AminoacidChangesGroup, Nucleotide } from 'src/types'
import { safeZip, safeZip3 } from 'src/helpers/safeZip'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { first, isNil, last } from 'lodash'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'

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

export interface PeptideContextCodonProps {
  refCodon: string
  queryCodon: string
  change?: AminoacidChange
  codon?: number
  nucBegin?: number
}

export function PeptideContextCodon({ refCodon, queryCodon, change, codon, nucBegin }: PeptideContextCodonProps) {
  const refAA = change?.refAA
  const queryAA = change?.queryAA
  const highlight: boolean[] = safeZip(refCodon.split(''), queryCodon.split('')).map(([ref, query]) => ref !== query)

  const codonOneBased = useMemo(() => {
    if (isNil(codon)) {
      return 0
    }
    return codon + 1
  }, [codon])

  const nucBeginNeBased = useMemo(() => {
    if (isNil(nucBegin)) {
      return 0
    }
    return nucBegin + 1
  }, [nucBegin])

  return (
    <td>
      <TableNuc>
        <TableBodyNuc>
          <TrNuc>
            <TdNuc colSpan={3}>
              <AminoacidPositionText>{codonOneBased}</AminoacidPositionText>
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
              <NucleotidePositionText>{nucBeginNeBased}</NucleotidePositionText>
            </TdAxis>
          </TrNuc>
        </TableBodyNuc>
      </TableNuc>
    </td>
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
  strand?: string
}

/* eslint-disable @typescript-eslint/no-non-null-assertion, sonarjs/no-identical-functions */
export function PeptideContext({ group, strand }: PeptideContextProps) {
  const { t } = useTranslationSafe()

  const { width, codonsBefore, codonsBegin, ellipsis, codonsEnd, codonsAfter } = useMemo(() => {
    const { changes, codonAaRange, nucContexts } = group

    // HACK: only uses the first nuc context
    // TODO: figure out what to do in cas there are multiple nuc contexts
    const { refContext, qryContext, contextNucRange } = nucContexts[0]

    const refCodons = refContext.match(/.{1,3}/g)!
    const queryCodons = qryContext.match(/.{1,3}/g)!

    const firstRefCodon = first(refCodons)!
    const lastRefCodon = last(refCodons)!

    const firstQryCodon = first(queryCodons)!
    const lastQryCodon = last(queryCodons)!

    const refCodonsSlice = refCodons.slice(1, -1)
    const queryCodonsSlice = queryCodons.slice(1, -1)

    // TODO: FIXME: this is to avaoid crashes, but nuc context needs to be fixed on the backend
    if (changes.length !== queryCodonsSlice.length || changes.length !== refCodonsSlice.length) {
      return {
        width: 0,
        codonsBefore: null,
        codonsBegin: [],
        ellipsis: null,
        codonsEnd: [],
        codonsAfter: null,
      }
    }

    const changesAndCodons = safeZip3(changes, refCodonsSlice, queryCodonsSlice)

    let itemsBegin = changesAndCodons
    let itemsEnd: typeof changesAndCodons = []
    if (changesAndCodons.length > 6) {
      itemsBegin = changesAndCodons.slice(0, 3)
      itemsEnd = changesAndCodons.slice(-3)
    }

    const width = (itemsBegin.length + itemsEnd.length + 2) * 80 + 80

    const leftCodonPos = strand === '+' ? contextNucRange.begin : contextNucRange.end - 1
    const codonsBefore = (
      <PeptideContextCodon
        refCodon={firstRefCodon}
        queryCodon={firstQryCodon}
        codon={codonAaRange.begin - 1}
        nucBegin={leftCodonPos}
      />
    )

    const rightCodonPos = strand === '+' ? contextNucRange.end - 3 : contextNucRange.begin + 2
    const codonsAfter = (
      <PeptideContextCodon
        refCodon={lastRefCodon}
        queryCodon={lastQryCodon}
        codon={codonAaRange.end}
        nucBegin={rightCodonPos}
      />
    )

    const ellipsis = itemsEnd.length > 0 ? <PeptideContextEllipsis /> : null

    const codonsBegin = itemsBegin.map(([change, refCodon, queryCodon]) => {
      // HACK: only uses the first nuc context
      // TODO: figure out what to do in cas there are multiple nuc contexts
      const { codonNucRange } = change.nucContexts[0]
      const nucBegin = strand === '+' ? codonNucRange.begin : codonNucRange.end - 1
      return (
        <PeptideContextCodon
          key={change.codon}
          refCodon={refCodon}
          queryCodon={queryCodon}
          change={change}
          codon={change.codon}
          nucBegin={nucBegin}
        />
      )
    })

    const codonsEnd = itemsEnd.map(([change, refCodon, queryCodon]) => {
      // HACK: only uses the first nuc context
      // TODO: figure out what to do in cas there are multiple nuc contexts
      const { codonNucRange } = change.nucContexts[0]
      const nucBegin = strand === '+' ? codonNucRange.begin : codonNucRange.end - 1
      return (
        <PeptideContextCodon
          key={change.codon}
          refCodon={refCodon}
          queryCodon={queryCodon}
          change={change}
          codon={change.codon}
          nucBegin={nucBegin}
        />
      )
    })

    return {
      width,
      codonsBefore,
      codonsBegin,
      ellipsis,
      codonsEnd,
      codonsAfter,
    }
  }, [group, strand])

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

          {codonsBefore}
          {codonsBegin}
          {ellipsis}
          {codonsEnd}
          {codonsAfter}
        </tr>
      </tbody>
    </Table>
  )
}
