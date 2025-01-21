import { sortBy } from 'lodash'
import { formatReference } from 'src/components/Main/DatasetInfo'
import { attrStrMaybe, Dataset, MinimizerSearchRecord } from 'src/types'
import { mix, transparentize } from 'polished'
import React, { CSSProperties, useMemo } from 'react'
import { ListChildComponentProps } from 'react-window'
import { Col, Row } from 'reactstrap'
import { useRecoilState } from 'recoil'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { AutoSizer, FixedSizeList } from 'src/components/Results/ResultsTable'
import {
  HEADER_ROW_HEIGHT,
  TableCell,
  TableCellName,
  TableCellRowIndex,
  TableCellText,
  TableHeaderCell,
  TableHeaderCellContent,
  TableHeaderRow,
  TableRow,
} from 'src/components/Results/ResultsTableStyle'
import { colorHash } from 'src/helpers/colorHash'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useDatasetSuggestionResults } from 'src/hooks/useRunSeqAutodetect'
import { datasetsAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'

const ROW_HEIGHT = 60

export const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const WrapperOuter = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
`

const WrapperInner = styled.div<{ $minWidth: number }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: ${(props) => props.$minWidth}px;
`

const MainContent = styled.main`
  flex: 1;
  flex-basis: 100%;
  border: none;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export const Table = styled.div<{ rounded?: boolean }>`
  font-size: 0.8rem;
  width: 100%;
  height: 100%;
  background-color: #b3b3b3aa;
  overflow: hidden;
  transition: border-radius 250ms linear;
`

const LIST_STYLE: CSSProperties = { overflowY: 'scroll' }

export function SortPage() {
  const { t } = useTranslationSafe()

  const run = useRunAnalysisMany()
  const { recordsByDataset } = useDatasetSuggestionResults()

  const [datasets] = useRecoilState(datasetsAtom)

  const results = useMemo(() => {
    if (!recordsByDataset) {
      return []
    }

    const results = Object.entries(recordsByDataset).flatMap(([datasetName, { records }]) => {
      const dataset = datasets.datasets.find((dataset) => dataset.path === datasetName)
      if (!dataset) {
        throw new ErrorInternal(`Dataset info not found for: ${datasetName}`)
      }
      return records
        .map((record) => ({ dataset, ...record }))
        .filter(({ dataset, result }) => {
          return result.datasets[0]?.name === dataset.path
        })
    })
    return sortBy(results, (result) => result.fastaRecord.index)
  }, [datasets.datasets, recordsByDataset])

  return (
    <Layout>
      <Container>
        <WrapperOuter>
          <WrapperInner $minWidth={0}>
            <MainContent>
              <Table rounded={false}>
                <TableHeaderRow>
                  <TableHeaderCell first basis="60px" grow={0} shrink={0}>
                    <TableHeaderCellContent>
                      <TableCellText>{'#'}</TableCellText>
                    </TableHeaderCellContent>
                  </TableHeaderCell>

                  <TableHeaderCell basis="60px" grow={0} shrink={0}>
                    <TableHeaderCellContent>
                      <TableCellText>{'i'}</TableCellText>
                    </TableHeaderCellContent>
                  </TableHeaderCell>

                  <TableHeaderCell basis="300px" grow={1} shrink={1}>
                    <TableHeaderCellContent>
                      <TableCellText>{t('Sequence name')}</TableCellText>
                    </TableHeaderCellContent>
                  </TableHeaderCell>

                  <TableHeaderCell basis="300px" grow={1} shrink={1}>
                    <TableHeaderCellContent>
                      <TableCellText>{t('Dataset')}</TableCellText>
                    </TableHeaderCellContent>
                  </TableHeaderCell>

                  <TableHeaderCell basis="60px" grow={0} shrink={0}>
                    <TableHeaderCellContent>
                      <TableCellText>{t('Top score')}</TableCellText>
                    </TableHeaderCellContent>
                  </TableHeaderCell>

                  <TableHeaderCell basis="60px" grow={0} shrink={0}>
                    <TableHeaderCellContent>
                      <TableCellText>{t('Candidate datasets')}</TableCellText>
                    </TableHeaderCellContent>
                  </TableHeaderCell>
                </TableHeaderRow>

                <AutoSizer>
                  {({ width, height }) => {
                    return (
                      <FixedSizeList
                        overscanCount={10}
                        style={LIST_STYLE}
                        width={width}
                        height={height - HEADER_ROW_HEIGHT}
                        itemCount={results.length}
                        itemSize={ROW_HEIGHT}
                        itemData={results}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                        {/* @ts-ignore */}
                        {SortingTableRow}
                      </FixedSizeList>
                    )
                  }}
                </AutoSizer>
              </Table>
            </MainContent>

            <Footer>
              <Row noGutters className="w-100">
                <Col className="w-100 d-flex">
                  <ButtonRun className="ml-auto" onClick={run} />
                </Col>
              </Row>
            </Footer>
          </WrapperInner>
        </WrapperOuter>
      </Container>
    </Layout>
  )
}

export function useRunAnalysisMany() {
  return () => {}
}

export interface SortingTableRowDatum extends MinimizerSearchRecord {
  dataset: Dataset
}

export function SortingTableRow({ data, index, style }: ListChildComponentProps<SortingTableRowDatum[]>) {
  const record = useMemo(() => data[index], [data, index])

  const { backgroundColor, opacity } = useMemo(() => {
    // const even = index % 2 === 0
    // const baseRowColor = even ? '#ededed' : '#fcfcfc'
    const baseRowColor = '#fcfcfc'
    const datasetColor = transparentize(0.5, colorHash(record.dataset.path, { reverse: true }))
    const backgroundColor = mix(0.5, baseRowColor, datasetColor)
    const opacity = undefined
    return { backgroundColor, opacity }
  }, [record.dataset])

  const datasetName = attrStrMaybe(record.dataset.attributes, 'name') ?? ''
  const datasetRef = formatReference(record.dataset.attributes)

  return (
    <TableRow style={style} backgroundColor={backgroundColor} opacity={opacity}>
      <TableCellRowIndex basis="60px" grow={0} shrink={0}>
        <TableCellText>{index}</TableCellText>
      </TableCellRowIndex>

      <TableCell basis="60px" grow={0} shrink={0}>
        <TableCellText>{record.fastaRecord.index}</TableCellText>
      </TableCell>

      <TableCellName basis="300px" grow={1} shrink={1}>
        {record.fastaRecord.seqName}
      </TableCellName>

      <TableCellName basis="300px" grow={1} shrink={1}>
        <div className="d-flex flex-column">
          <div className="font-weight-bold">{datasetName}</div>
          <div>{datasetRef}</div>
          <i>{record.dataset.path}</i>
        </div>
      </TableCellName>

      <TableCell basis="60px" grow={0} shrink={0}>
        <TableCellText>{record.result.datasets[0]?.score.toFixed(3) ?? ''}</TableCellText>
      </TableCell>

      <TableCell basis="60px" grow={0} shrink={0}>
        <TableCellText>{record.result.datasets.length}</TableCellText>
      </TableCell>
    </TableRow>
  )
}
