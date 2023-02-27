import { countBy, get, isEmpty, sortBy, sumBy } from 'lodash'
import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import {
  Col,
  Modal as ReactstrapModal,
  ModalHeader as ReactstrapModalHeader,
  ModalBody as ReactstrapModalBody,
  Row,
  Button,
  Container,
} from 'reactstrap'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { CategoricalChartProps } from 'recharts/types/chart/generateCategoricalChart'
import { BsBarChartFill as StatsIconOrig } from 'react-icons/bs'
import { ColumnDef } from '@tanstack/react-table'
import type { NextcladeResult } from 'src/types'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useToggle } from 'src/hooks/useToggle'
import {
  analysisResultsAtom,
  canDownloadAtom,
  cladeNodeAttrDescsAtom,
  statsCriterionAtom,
} from 'src/state/results.state'
import { Dropdown, DropdownEntry } from 'src/components/Common/Dropdown'
import { Table } from 'src/components/Table/Table'
import { getColumnDefNames } from 'src/components/Table/helpers'
import { colorHash } from 'src/helpers/colorHash'
import { ColoredSquare } from 'src/components/Common/ColoredSquare'

export function ButtonStats() {
  const { t } = useTranslationSafe()
  const [isOpen, toggleOpen, open, close] = useToggle(false)

  const canDownload = useRecoilValue(canDownloadAtom)
  const title = useMemo(() => t('Statistics by {{criterion}}', { criterion: '' }), [t])

  const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom)
  const criteria = useMemo(() => {
    const criteria = cladeNodeAttrDescs
      .filter((desc) => !desc.hideInWeb)
      .map((desc) => ({
        key: desc.name,
        value: t(desc.displayName),
      }))
    criteria.unshift({ key: 'clade', value: t('Clade') })
    return criteria
  }, [cladeNodeAttrDescs, t])

  return (
    <>
      <Button type="button" color="transparent" onClick={open} title={title} disabled={!canDownload}>
        <StatsIcon size={20} />
      </Button>
      <Modal isOpen={isOpen} toggle={toggleOpen} fade={false} size="xl">
        <ModalHeader toggle={close} tag="div" className="d-flex">
          <div className="d-flex mx-auto">
            <span className="mx-2 mt-2">
              <h4>{title}</h4>
            </span>
            <span>
              <StatsCriterionSelector criteria={criteria} />
            </span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Container fluid>
            <Row noGutters>
              <Col>
                <Statistics criteria={criteria} />
              </Col>
            </Row>
          </Container>
        </ModalBody>
      </Modal>
    </>
  )
}

export const StatsIcon = styled(StatsIconOrig)`
  width: 20px;
  height: 20px;
`

export const Modal = styled(ReactstrapModal)``

export const ModalBody = styled(ReactstrapModalBody)`
  height: calc(100vh - 4rem - 4rem - 56px) !important;
  overflow: hidden !important;
`

export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    display: flex;
    width: 100%;
  }
`

export function StatsCriterionSelector({ criteria, ...restProps }: { criteria: DropdownEntry[] }) {
  const [currentStatsCriterion, setCurrentStatsCriterion] = useRecoilState(statsCriterionAtom)
  const setCurrentEntry = useCallback(
    (entry: DropdownEntry) => setCurrentStatsCriterion(entry.key),
    [setCurrentStatsCriterion],
  )

  const currentEntry = useMemo(
    () => criteria.find((criterion) => criterion.key === currentStatsCriterion) ?? criteria[0],
    [criteria, currentStatsCriterion],
  )

  return <Dropdown entries={criteria} currentEntry={currentEntry} setCurrentEntry={setCurrentEntry} {...restProps} />
}

export interface StatEntry {
  key: string
  count: number
  color: string
}

export function Statistics({ criteria }: { criteria: { key: string; value: string }[] }) {
  const results = useRecoilValue(analysisResultsAtom)
  const [currentStatsCriterion, setCurrentStatsCriterion] = useRecoilState(statsCriterionAtom)

  const data: StatEntry[] = useMemo(() => {
    const data = getDataByCriterion(results, currentStatsCriterion)
    if (isEmpty(data) && currentStatsCriterion !== 'clade') {
      setCurrentStatsCriterion('clade')
    }

    const entries = Object.entries(countBy(data))
    const total = sumBy(entries, ([_, count]) => count)
    return entries.map(([key, count]) => ({ key, count, percentage: count / total, color: colorHash(key) }))
  }, [currentStatsCriterion, results, setCurrentStatsCriterion])

  return (
    <Container>
      <Row noGutters>
        <Col>
          <StatsBarChart data={data} />
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <StatsPieChart className="w-100" data={data} />
        </Col>
        <Col>
          <StatsTable data={data} criteria={criteria} />
        </Col>
      </Row>
    </Container>
  )
}

function getDataByCriterion(results: NextcladeResult[], statsCriterion: string) {
  if (statsCriterion === 'clade') {
    return results.map((result) => result.result?.analysisResult.clade).filter(notUndefinedOrNull)
  }
  return results
    .map((result) => get(result.result?.analysisResult.customNodeAttributes, statsCriterion))
    .filter(notUndefinedOrNull)
}

export interface StatsTableProps {
  data: StatEntry[]
  criteria: { key: string; value: string }[]
}

export function StatsTable({ data, criteria }: StatsTableProps) {
  const { t } = useTranslationSafe()

  const currentStatsCriterion = useRecoilValue(statsCriterionAtom)
  const criterionNameFriendly = useMemo(() => {
    const cr = (criteria.find((cr) => cr.key === currentStatsCriterion) ?? criteria[0]).value
    return t(cr)
  }, [criteria, currentStatsCriterion, t])

  const { columns, initialColumnOrder, searchKeys } = useMemo(() => {
    const columns: ColumnDef<StatEntry>[] = [
      {
        header: criterionNameFriendly,
        accessorFn: (row) => row,
        size: 200,
        // eslint-disable-next-line react/no-unstable-nested-components
        cell: (ctx) => <StatsTableKeyCell entry={ctx.getValue<StatEntry>()} />,
      },
      {
        header: 'Count',
        accessorFn: (row) => row.count,
        minSize: 75,
        size: 75,
      },
    ]

    const initialColumnOrder = getColumnDefNames(columns)
    const searchKeys: (keyof StatEntry)[] = ['key']

    return { columns, initialColumnOrder, searchKeys }
  }, [criterionNameFriendly])

  const [selectedRowId, setSelectedRowId] = useState(undefined)

  return (
    <Table
      data_={data}
      columns_={columns}
      initialColumnOrder={initialColumnOrder}
      searchKeys={searchKeys}
      selectedRowId={selectedRowId}
      setSelectedRowId={setSelectedRowId}
    />
  )
}

export interface StatsTableKeyCellProps {
  entry: StatEntry
}

export function StatsTableKeyCell({ entry }: StatsTableKeyCellProps) {
  return (
    <span className="d-flex">
      <ColoredSquare size="1rem" color={entry.color} />
      <span className="ml-1">{entry.key}</span>
    </span>
  )
}

export interface StatsBarChartProps extends CategoricalChartProps {
  data: StatEntry[]
  width?: number
  height?: number
}

export function StatsBarChart({ data, ...restProps }: StatsBarChartProps) {
  const finalData = useMemo(() => sortBy(data, (e) => e.key), [data])
  const margin = useMemo(() => ({ top: 10, left: -38, bottom: 40, right: 0 }), [])
  return (
    <ResponsiveContainer width="100%" aspect={3}>
      <StyledBarChart data={finalData} margin={margin} {...restProps}>
        <Bar dataKey="count" fill="#8884d8" isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Bar>
        <XAxis dataKey="key" fontSize={10} interval={0} angle={-45} textAnchor="end" />
        <YAxis fontSize={10} interval={0} />
        <ChartTooltip isAnimationActive={false} />
      </StyledBarChart>
    </ResponsiveContainer>
  )
}

const StyledBarChart = styled(BarChart)`
  margin: 1rem;
`

export interface StatsPieChartProps extends CategoricalChartProps {
  data: StatEntry[]
}

export function StatsPieChart({ data, ...restProps }: StatsPieChartProps) {
  const finalData = useMemo(() => sortBy(data, (e) => e.key), [data])
  const margin = useMemo(() => ({ top: 0, left: 0, bottom: 0, right: 0 }), [])
  return (
    <ResponsiveContainer width="100%" aspect={1}>
      <PieChart data={finalData} margin={margin} {...restProps}>
        <ChartTooltip isAnimationActive={false} />
        <Pie data={finalData} dataKey="count" nameKey="key" isAnimationActive={false} stroke="" innerRadius={70}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
