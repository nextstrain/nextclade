import React, { useMemo } from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'

import { State } from 'src/state/reducer'
import { FilterBadge } from 'src/components/Tree/FilterBadge'

export const FilterBadgeContainer = styled.ul`
  display: flex;
  flex-wrap: wrap;
  flex: 0;
  list-style: none;
  padding-left: 8px;
  margin: 0;
  margin-top: 3px;
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

export interface FilterBadgesProps {
  filters?: Record<string, string[]>
}

const mapStateToProps = (state: State) => ({
  filters: state.controls?.filters,
})

const mapDispatchToProps = {}

export const FilterBadges = connect(mapStateToProps, mapDispatchToProps)(FilterBadgesDisconnected)

export function FilterBadgesDisconnected({ filters }: FilterBadgesProps) {
  const filterBadges = useMemo(() => {
    if (!filters) {
      return []
    }

    return Object.entries(filters).reduce(
      (result, [trait, filters]) =>
        result.concat(filters.map((filter) => <FilterBadge key={`${trait}:${filter}`} trait={trait} value={filter} />)),
      [] as React.ReactNode[],
    )
  }, [filters])

  return <FilterBadgeContainer>{filterBadges}</FilterBadgeContainer>
}
