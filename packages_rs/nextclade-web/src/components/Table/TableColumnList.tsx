import React, { useCallback, useMemo, useState } from 'react'
import copy from 'fast-copy'
import { Column, Table as ReactTable } from '@tanstack/react-table'
import { Reorder } from 'framer-motion'
import { isEqual, uniqueId } from 'lodash'
import { BsThreeDotsVertical as MenuIcon } from 'react-icons/bs'
import { IoReorderFourOutline as IconReorder } from 'react-icons/io5'
import { MdUndo as IconUndo } from 'react-icons/md'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  CustomInput,
  FormGroup,
  Label,
  Popover as PopoverBase,
  PopoverProps,
  Row,
} from 'reactstrap'
import { getColumnName } from 'src/components/Table/helpers'
import styled, { useTheme } from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

const ColumnListUl = styled(Reorder.Group)`
  width: 100%;
  padding-left: 0;
`

const ColumnListLi = styled(Reorder.Item)`
  list-style: none;
`

export interface ColumnListItemProps<T> {
  column: Column<T, unknown>
}

export function ColumnListItem<T>({ column }: ColumnListItemProps<T>) {
  const theme = useTheme()
  const name = getColumnName(column)
  const id = useMemo(() => `column-toggle-${name}`, [name])

  return (
    <FormGroup check inline>
      <IconReorder color={theme.gray600} size={16} />
      <CustomInput
        className="ml-1"
        id={id}
        type="checkbox"
        checked={column.getIsVisible()}
        onChange={column.getToggleVisibilityHandler()}
      />
      <Label htmlFor={id} check>
        {name}
      </Label>
    </FormGroup>
  )
}

export interface ColumnListProps<T> {
  table: ReactTable<T>
  initialColumnOrder: string[]
}

export function ColumnList<T>({ table, initialColumnOrder }: ColumnListProps<T>) {
  const { t } = useTranslationSafe()
  const id = useMemo(() => uniqueId('columns-toggle-all'), [])

  const { columnOrder } = table.getState()
  const columns = table.getAllLeafColumns()

  const isDefaultOrder = useMemo(() => isEqual(columnOrder, initialColumnOrder), [columnOrder, initialColumnOrder])

  const resetColumnOrder = useCallback(() => {
    table.setColumnOrder(copy(initialColumnOrder))
  }, [initialColumnOrder, table])

  return (
    <ColumnListUl axis="y" values={table.getState().columnOrder} onReorder={table.setColumnOrder}>
      <ColumnListLi value="">
        <FormGroup check inline>
          <CustomInput
            id={id}
            type="checkbox"
            checked={table.getIsAllColumnsVisible()}
            onChange={table.getToggleAllColumnsVisibilityHandler()}
          />
          <Label htmlFor={id} check>
            {t('Toggle All')}
          </Label>
          <Button
            className="p-0 m-0 ml-2"
            color="link"
            onClick={resetColumnOrder}
            title={t('Reset column order and visibility')}
            hidden={isDefaultOrder}
          >
            <IconUndo size={12} />
            <span className="ml-1">{t('Reset order')}</span>
          </Button>
        </FormGroup>
      </ColumnListLi>
      {columns.map((column) => {
        const name = getColumnName(column)
        return (
          <ColumnListLi key={name} value={name}>
            <ColumnListItem column={column} />
          </ColumnListLi>
        )
      })}
    </ColumnListUl>
  )
}

export interface ColumnListDropdownProps<T> {
  table: ReactTable<T>
  initialColumnOrder: string[]
}

export function ColumnListDropdown<T>({ table, initialColumnOrder }: ColumnListDropdownProps<T>) {
  const { t } = useTranslationSafe()
  const theme = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => setDropdownOpen((prevState) => !prevState), [])
  const id = useMemo(() => uniqueId('menu'), [])
  return (
    <>
      <Button id={id} color="link" onClick={toggle}>
        <MenuIcon color={theme.gray700} size={16} />
      </Button>
      <Popover target={id} placement="bottom-end" delay={0} fade={false} $width={300} isOpen={dropdownOpen} hideArrow>
        <Card>
          <CardHeader className="bg-dark text-light">{t('Columns')}</CardHeader>
          <CardBody>
            <Row noGutters>
              <Col>
                <ColumnList table={table} initialColumnOrder={initialColumnOrder} />
              </Col>
            </Row>
            <Row noGutters>
              <Col>
                <Button color="secondary" onClick={toggle}>
                  {t('Ok')}
                </Button>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Popover>
    </>
  )
}

export const Popover = styled(PopoverBase)<PopoverProps & { $width: string }>`
  & .popover {
    max-width: ${({ $width }) => `${$width}px`};
  }
  & .popover.show.bs-popover-auto {
    min-width: ${({ $width }) => `${$width}px`};
  }
`
