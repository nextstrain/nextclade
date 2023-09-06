import classNames from 'classnames'
import { sortBy } from 'lodash'
import { mix, transparentize } from 'polished'
import React, { useMemo } from 'react'
import { Col as ColBase, Row as RowBase } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled, { useTheme } from 'styled-components'
import type { MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { isEven } from 'src/helpers/number'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Layout } from 'src/components/Layout/Layout'
import { safeZip3 } from 'src/helpers/safeZip'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { autodetectResultsAtom, minimizerIndexAtom } from 'src/state/autodetect.state'

const Container = styled.div`
  margin-top: 1rem;
  padding-bottom: 1.5rem;
  height: 100%;
  overflow: hidden;
`

const Row = styled(RowBase)`
  overflow: hidden;
  height: 100%;
`

const Col = styled(ColBase)`
  overflow: hidden;
  height: 100%;
`

const Table = styled(TableSlim)`
  padding-top: 50px;

  & thead {
    height: 51px;
    position: sticky;
    top: -2px;
    background-color: ${(props) => props.theme.gray700};
    color: ${(props) => props.theme.gray100};
  }

  & thead th {
    margin: auto;
    text-align: center;
    vertical-align: middle;
  }

  & td {
    border: none;
    border-left: 1px solid #ccc;
  }

  & tr {
    border: none !important;
  }

  & th {
    border: 1px solid #ccc;
  }
`

const TableWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
`

export function AutodetectPage() {
  const { t } = useTranslationSafe()
  const minimizerIndex = useRecoilValue(minimizerIndexAtom)
  const autodetectResults = useRecoilValue(autodetectResultsAtom)

  const rows = useMemo(() => {
    const results = sortBy(autodetectResults, (result) => result.fastaRecord.index)
    return results.map((res, i) => (
      <AutodetectTableRowSpan key={res.fastaRecord.index} order={i} res={res} minimizerIndex={minimizerIndex} />
    ))
  }, [autodetectResults, minimizerIndex])

  return (
    <Layout>
      <Container>
        <Row noGutters>
          <Col>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>{'#'}</th>
                    <th>{t('Seq. name')}</th>
                    <th>{t('Length')}</th>
                    <th>{t('Total hits')}</th>
                    <th>{t('Max norm. hit')}</th>
                    <th>{t('Dataset')}</th>
                    <th>{t('Ref. length')}</th>
                    <th>{t('Num. hits')}</th>
                    <th>{t('Norm. hit')}</th>
                  </tr>
                </thead>

                <tbody>{rows}</tbody>
              </Table>
            </TableWrapper>
          </Col>
        </Row>
      </Container>
    </Layout>
  )
}

interface AutodetectTableRowSpanProps {
  order: number
  res: MinimizerSearchRecord
  minimizerIndex: MinimizerIndexJson
}

function AutodetectTableRowSpan({ order, res, minimizerIndex }: AutodetectTableRowSpanProps) {
  const theme = useTheme()

  const { hitCounts, maxNormalizedHit, normalizedHits, totalHits } = res.result
  const { seqName, index: seqIndex, seq } = res.fastaRecord
  const qryLen = seq.length

  const rows = useMemo(() => {
    let entries = safeZip3(normalizedHits, hitCounts, minimizerIndex.references ?? []).map(([score, hits, ref]) => {
      return { dataset: ref.name, refLen: ref.length, score, hits }
    })

    entries = sortBy(entries, (entry) => -entry.score)

    let color = isEven(order) ? theme.table.rowBg.even : theme.table.rowBg.odd

    const goodEntries = entries.filter(
      ({ score, hits }) => maxNormalizedHit >= 0.6 && hits >= 10 && score >= maxNormalizedHit * 0.5,
    )

    const mediocreEntries = entries.filter(
      ({ score, hits }) => maxNormalizedHit >= 0.3 && hits >= 10 && score >= maxNormalizedHit * 0.5,
    )

    const badEntries = entries.filter(
      ({ score, hits }) => maxNormalizedHit >= 0.05 && hits > 0 && score >= maxNormalizedHit * 0.5,
    )

    if (goodEntries.length > 0) {
      entries = goodEntries
    } else if (mediocreEntries.length > 0) {
      entries = mediocreEntries
      color = mix(0.3, transparentize(0.3)(theme.warning), color)
    } else {
      entries = badEntries
      color = mix(0.5, transparentize(0.5)(theme.danger), color)
    }

    return entries.map(({ dataset, score, hits, refLen }, i) => {
      const cls = classNames(i === 0 && 'font-weight-bold')

      return (
        <Tr key={dataset} $bg={color}>
          {i === 0 && (
            <>
              <TdIndex rowSpan={entries.length} title={seqIndex.toString()}>
                {seqIndex}
              </TdIndex>

              <TdName rowSpan={entries.length} title={seqName}>
                {seqName}
              </TdName>

              <TdNumeric rowSpan={entries.length} title={qryLen.toString()}>
                {qryLen}
              </TdNumeric>

              <TdNumeric rowSpan={entries.length} title={totalHits.toString()}>
                {totalHits}
              </TdNumeric>

              <TdNumeric rowSpan={entries.length} title={maxNormalizedHit.toFixed(3)}>
                {maxNormalizedHit.toFixed(3)}
              </TdNumeric>
            </>
          )}
          <TdName className={cls} title={dataset}>
            {dataset}
          </TdName>
          <TdNumeric className={cls} title={refLen.toString()}>
            {refLen}
          </TdNumeric>
          <TdNumeric className={cls} title={hits.toString()}>
            {hits}
          </TdNumeric>
          <TdNumeric className={cls} title={score.toFixed(3)}>
            {score.toFixed(3)}
          </TdNumeric>
        </Tr>
      )
    })
  }, [
    normalizedHits,
    hitCounts,
    minimizerIndex.references,
    order,
    theme.table.rowBg.even,
    theme.table.rowBg.odd,
    theme.warning,
    theme.danger,
    maxNormalizedHit,
    seqIndex,
    seqName,
    qryLen,
    totalHits,
  ])

  return (
    <>
      {rows}
      <TrSpacer>
        <td colSpan={9} />
      </TrSpacer>
    </>
  )
}

const Tr = styled.tr<{ $bg?: string }>`
  background-color: ${(props) => props.$bg};
`

const Td = styled.td`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
  font-size: 0.95rem;
`

const TdName = styled(Td)`
  min-width: 200px;
  font-size: 0.9rem;
`

const TdNumeric = styled(Td)`
  text-align: right;
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.9rem;
`

const TdIndex = styled(TdNumeric)`
  background-color: ${(props) => props.theme.gray700};
  color: ${(props) => props.theme.gray100};
`

const TrSpacer = styled.tr`
  height: 2px;

  & td {
    background-color: ${(props) => props.theme.gray400};
  }
`
