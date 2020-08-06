import React, { useCallback } from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { MdClear } from 'react-icons/md'
import { useTranslation } from 'react-i18next'

import { applyFilter } from 'auspice/src/actions/tree'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

export const FilterBadgeItem = styled.li`
  display: flex;
  box-shadow: ${(props) => props.theme.shadows.slight};
  margin: 2px;
  font-size: 0.85rem;
  white-space: nowrap;
`

export const FilterBadgeLeft = styled.span<{ background?: string }>`
  padding: 0 6px;
  background-color: ${(props) => props.background ?? props.theme.gray650};
  color: ${(props) => props.theme.gray200};
  border-radius: 3px 0px 0px 3px;
`

export const FilterBadgeRight = styled.span`
  padding: 0 6px;
  background-color: ${(props) => props.theme.gray650};
  color: ${(props) => props.theme.gray200};
  border-radius: 0px 3px 3px 0px;
`

export const FilterBadgeRemoveButton = styled(ButtonTransparent)`
  display: inline;
  margin: 0;
  margin-left: 5px;
  padding: 0;
  padding-bottom: 5px;
  width: 0.85rem;
  height: 0.85rem;
  cursor: pointer;
`

export const FilterBadgeRemoveIcon = styled(MdClear)`
  display: block;
  margin: 0;
  padding: 0;
  width: 0.85rem;
  height: 0.85rem;
`

export const traitTexts = new Map<string, string>(
  Object.entries({
    'Node type': 'Node Type',
    'clade_membership': 'Clade',
    'country': 'Country',
    'division': 'Division',
    'region': 'Region',
    'QC Status': 'QC Status',
  }),
)

export const traitColors = new Map<string, string>(
  Object.entries({
    'Node type': '#417492',
    'clade_membership': '#6b5e8e',
    'country': '#997e48',
    'division': '#43705b',
    'region': '#3b7580',
    'QC Status': '#7f5d63',
  }),
)

export interface FilterBadgeProps {
  trait: string
  value: string
  applyFilter(mode: string, trait: string, values: string[]): void
}

const mapStateToProps = undefined
const mapDispatchToProps = { applyFilter }

export const FilterBadge = connect(mapStateToProps, mapDispatchToProps)(FilterBadgeDisconnected)

export function FilterBadgeDisconnected({ trait, value, applyFilter }: FilterBadgeProps) {
  const { t } = useTranslation()
  const removeFilter = useCallback(() => applyFilter('remove', trait, [value]), [applyFilter, trait, value])

  const traitText = traitTexts.get(trait) ?? ''
  const traitColor = traitColors.get(trait)

  return (
    <FilterBadgeItem>
      <FilterBadgeLeft background={traitColor}>{traitText}</FilterBadgeLeft>
      <FilterBadgeRight>
        {value}
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
        <FilterBadgeRemoveButton title={t('Remove filter')} onClick={removeFilter}>
          <FilterBadgeRemoveIcon />
        </FilterBadgeRemoveButton>
      </FilterBadgeRight>
    </FilterBadgeItem>
  )
}
