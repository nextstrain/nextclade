import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { Table as ReactstrapTable } from 'reactstrap'
import { desaturate, lighten } from 'polished'
import type { AaChangeWithContext, Aminoacid, AaChangesGroup, Nucleotide } from 'src/types'
import { safeZip } from 'src/helpers/safeZip'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
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
  change: AaChangeWithContext
}

export function PeptideContextCodon({
  change: { codon, nucPos, qryAa, refAa, qryTriplet, refTriplet },
}: PeptideContextCodonProps) {
  const { codonOneBased, nucBeginOneBased, refNucs, qryNucs } = useMemo(() => {
    const shouldHighlightNucs: boolean[] = safeZip(qryTriplet.split(''), refTriplet.split('')).map(
      ([ref, query]) => ref !== query,
    )

    const codonOneBased = codon + 1

    const nucBeginOneBased = nucPos + 1

    const refNucs = refTriplet.split('').map((nuc, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <PeptideContextNucleotide key={`${nuc}-${i}`} nuc={nuc} />
    ))

    const qryNucs = qryTriplet.split('').map((nuc, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <PeptideContextNucleotide key={`${nuc}-${i}`} nuc={nuc} shouldHighlight={shouldHighlightNucs[i]} />
    ))

    return { codonOneBased, nucBeginOneBased, refNucs, qryNucs }
  }, [codon, nucPos, qryTriplet, refTriplet])

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
            <PeptideContextAminoacid aa={refAa} />
          </TrNuc>

          <TrNuc>{refNucs}</TrNuc>

          <TrNuc>{qryNucs}</TrNuc>

          <TrNuc>
            <PeptideContextAminoacid aa={qryAa} />
          </TrNuc>

          <TrNuc>
            <TdAxis colSpan={3}>
              <NucleotidePositionText>{nucBeginOneBased}</NucleotidePositionText>
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
  group: AaChangesGroup
}

export function PeptideContext({ group }: PeptideContextProps) {
  const { t } = useTranslationSafe()

  console.log(group.changes)

  const { width, codonsBegin, ellipsis, codonsEnd } = useMemo(() => {
    const { changes } = group

    let itemsBegin = changes
    let itemsEnd: typeof changes = []
    let ellipsis = null
    if (changes.length > 8) {
      itemsBegin = changes.slice(0, 4)
      itemsEnd = changes.slice(-4)
      ellipsis = <PeptideContextEllipsis />
    }

    const width = (itemsBegin.length + itemsEnd.length + 2) * 80 + 80
    const codonsBegin = itemsBegin.map((change) => <PeptideContextCodon key={change.codon} change={change} />)
    const codonsEnd = itemsEnd.map((change) => <PeptideContextCodon key={change.codon} change={change} />)

    return { width, codonsBegin, ellipsis, codonsEnd }
  }, [group])

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

          {codonsBegin}
          {ellipsis}
          {codonsEnd}
        </tr>
      </tbody>
    </Table>
  )
}
