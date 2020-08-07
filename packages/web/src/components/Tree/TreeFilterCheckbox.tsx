import React from 'react'

import { connect } from 'react-redux'
import { get } from 'lodash'
import styled from 'styled-components'

import { applyFilter } from 'auspice/src/actions/tree'

import { UNKNOWN_VALUE } from 'src/constants'
import type { AuspiceFiltersState } from 'src/state/auspice/auspice.state'
import { selectTraitValueCount } from 'src/state/auspice/auspice.selectors'
import type { State } from 'src/state/reducer'

import { FormGroup, Label, InputCheckbox } from './Form'

export const LabelStyled = styled(Label)`
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export interface TreeFilterCheckboxOwnProps {
  text: string
  trait: string
  value: string
}

export interface TreeFilterCheckboxProps extends TreeFilterCheckboxOwnProps {
  filters?: AuspiceFiltersState
  totalNodes: number
  applyFilter(mode: string, trait: string, values: string[]): void
}

const mapStateToProps = (state: State, { trait, value }: TreeFilterCheckboxOwnProps) => ({
  filters: state.controls?.filters,
  totalNodes: selectTraitValueCount(state, trait, value),
})

const mapDispatchToProps = {
  applyFilter,
}

export const TreeFilterCheckbox = connect(mapStateToProps, mapDispatchToProps)(TreeFilterCheckboxDisconnected)

export function TreeFilterCheckboxDisconnected({
  filters,
  totalNodes,
  applyFilter,
  text,
  trait,
  value,
}: TreeFilterCheckboxProps) {
  const concreteFilters = get(filters, trait) as string[] | undefined
  const isChecked = concreteFilters?.includes(value) ?? false

  const handleCheck = () => applyFilter('add', trait, [value])
  const handleUncheck = () => applyFilter('remove', trait, [value])
  const toggle = isChecked ? handleUncheck : handleCheck

  let displayText = text
  if (text === UNKNOWN_VALUE) {
    displayText = `${text.trim()}*`
  }
  displayText = `${displayText} (${totalNodes})`

  return (
    <FormGroup title={displayText} check>
      <LabelStyled title={displayText} check>
        <InputCheckbox type="checkbox" checked={isChecked} onChange={toggle} title={displayText} />
        {displayText}
      </LabelStyled>
    </FormGroup>
  )
}
