import React, { useCallback } from 'react'

import { noop } from 'lodash'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { MdClear } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { darken } from 'polished'

import type { State } from 'src/state/reducer'
import { applyFilter } from 'auspice/src/actions/tree'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { selectTraitValueCount } from 'src/state/auspice/auspice.selectors'

export function darkenIf(darkness: number, color: string, condition: boolean) {
  return condition ? darken(darkness, color) : color
}

export const FilterBadgeItem = styled.li`
  display: flex;
  box-shadow: ${(props) => props.theme.shadows.slight};
  margin: 2px;
  font-size: 0.85rem;
  white-space: nowrap;
`

export const FilterBadgeSection = styled.span<{ background: string; disabled: boolean }>`
  background-color: ${(props) => darkenIf(0.05, props.background, props.disabled)};
  color: ${(props) => darkenIf(0.25, props.theme.gray200, props.disabled)};
`

export const FilterBadgeLeft = styled(FilterBadgeSection)<{ background: string; disabled: boolean }>`
  padding: 0 6px;
  border-radius: 3px 0px 0px 3px;
  cursor: pointer;
`

export const FilterBadgeMiddle = styled(FilterBadgeSection)<{ background: string; disabled: boolean }>`
  padding: 0;
  padding-left: 5px;
  padding-right: 0px;
  cursor: pointer;
`

export const FilterBadgeRight = styled(FilterBadgeSection)<{ background: string; disabled: boolean }>`
  padding: 0;
  padding-right: 3px;
  padding-left: 0px;
  border-radius: 0px 3px 3px 0px;
`

export const BadgeText = styled.div<{ disabled?: boolean }>`
  text-decoration: ${(props) => (props.disabled ? 'line-through' : 'none')};
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

export interface FilterBadgeOwnProps {
  trait: string
  value: string
  disabled?: boolean
  setDisabled(trait: string, value: string): void
  setEnabled(trait: string, value: string): void
}

export interface FilterBadgeProps extends FilterBadgeOwnProps {
  totalNodes: number
  applyFilter(mode: string, trait: string, values: string[]): void
}

const mapStateToProps = (state: State, { trait, value }: FilterBadgeOwnProps) => ({
  totalNodes: selectTraitValueCount(state, trait, value),
})

const mapDispatchToProps = { applyFilter }

export const FilterBadge = connect(mapStateToProps, mapDispatchToProps)(FilterBadgeDisconnected)

export function FilterBadgeDisconnected({
  trait,
  value,
  disabled,
  totalNodes,
  applyFilter,
  setDisabled = noop,
  setEnabled = noop,
}: FilterBadgeProps) {
  const { t } = useTranslation()
  const addFilter = useCallback(() => applyFilter('add', trait, [value]), [applyFilter, trait, value])
  const removeFilter = useCallback(() => applyFilter('remove', trait, [value]), [applyFilter, trait, value])

  const disableFilter = useCallback(() => {
    if (disabled) {
      addFilter()
      setEnabled(trait, value)
    } else {
      removeFilter()
      setDisabled(trait, value)
    }
  }, [addFilter, disabled, removeFilter, setDisabled, setEnabled, trait, value])

  const removeBadge = useCallback(() => {
    setEnabled(trait, value)
    removeFilter()
  }, [removeFilter, setEnabled, trait, value])

  const traitText = traitTexts.get(trait) ?? ''
  const traitColor = traitColors.get(trait) ?? '#888'
  const valueColor = '#777'

  const valueText = `${value} (${totalNodes})`

  return (
    <FilterBadgeItem>
      <FilterBadgeLeft
        title={t('Click to disable this filter temporarily')}
        onClick={disableFilter}
        background={traitColor}
        disabled={disabled ?? false}
      >
        <BadgeText disabled={disabled}>{traitText}</BadgeText>
      </FilterBadgeLeft>
      <FilterBadgeMiddle
        title={t('Click to disable this filter temporarily')}
        onClick={disableFilter}
        background={valueColor}
        disabled={disabled ?? false}
      >
        <BadgeText disabled={disabled}>{valueText}</BadgeText>
      </FilterBadgeMiddle>
      <FilterBadgeRight background={valueColor} disabled={disabled ?? false}>
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
        <FilterBadgeRemoveButton title={t('Click to remove this filter')} onClick={removeBadge}>
          <FilterBadgeRemoveIcon />
        </FilterBadgeRemoveButton>
      </FilterBadgeRight>
    </FilterBadgeItem>
  )
}
