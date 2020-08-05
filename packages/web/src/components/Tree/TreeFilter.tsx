import React, { useMemo } from 'react'

import { get, uniq } from 'lodash'

import {
  Card as ReactstrapCard,
  CardBody as ReactstrapCardBody,
  CardHeader as ReactstrapCardHeader,
  CardBodyProps as ReactstrapCardBodyProps,
  CardHeaderProps as ReactstrapCardHeaderProps,
  CardProps as ReactstrapCardProps,
  Collapse,
} from 'reactstrap'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import type { AuspiceTreeNode } from 'auspice'

import { State } from 'src/state/reducer'
import { setTreeFilterPanelCollapsed } from 'src/state/ui/ui.actions'
import { notUndefined } from 'src/helpers/notUndefined'
import { TreeFilterCheckboxGroup } from 'src/components/Tree/TreeFilterCheckboxGroup'
import { UNKNOWN_VALUE } from 'src/constants'

export const Card = styled(ReactstrapCard)<ReactstrapCardProps>`
  box-shadow: 1px 1px 3px 2px rgba(128, 128, 128, 0.5);
`

export const CardHeader = styled(ReactstrapCardHeader)<ReactstrapCardHeaderProps>`
  display: flex;
  width: 100%;
  background-color: #495057;
  color: #fff;
  font-size: 1.25rem;
`

export const CardBody = styled(ReactstrapCardBody)<ReactstrapCardBodyProps>`
  background-color: #495057;
  display: flex;
  width: 100%;
  padding: 3px 3px;
`

export const CardHeaderText = styled.div`
  flex: 0 0;
  white-space: nowrap;
`

export const CardHeaderBadges = styled.div`
  flex: 1;
  flex-wrap: wrap;
`

export const FilterBadgeContainer = styled.ul`
  display: flex;
  flex-wrap: wrap;
  flex: 0;
  list-style: none;
  padding-left: 8px;
  margin: 0;
`

export const FilterBadge = styled.li`
  background-color: ${(props) => props.theme.gray600};
  color: ${(props) => props.theme.gray200};
  box-shadow: ${(props) => props.theme.shadows.slight};
  border-radius: 3px;
  margin: 2px;
  padding: 2px 6px;
  font-size: 0.85rem;
  white-space: nowrap;
`

export function moveToFirst<T>(arr: T[], value: T) {
  if (arr.includes(value)) {
    const others = arr.filter((x) => x !== value)
    return [value, ...others]
  }
  return arr
}

export function selectKnownTraitValues(state: State, trait: string) {
  const nodes = (state?.tree?.nodes ?? []) as AuspiceTreeNode[]
  const valuesRaw = nodes.map((node) => get(node, `node_attrs.${trait}.value`) as string | undefined) || []
  let values = valuesRaw.filter(notUndefined)
  values = uniq(values)
  values.sort()
  values = moveToFirst(values, UNKNOWN_VALUE)
  return values ?? []
}

const mapStateToProps = (state: State) => ({
  treeFilterPanelCollapsed: state.ui.treeFilterPanelCollapsed,
  filters: state?.controls?.filters ?? [],
  knownNodeTypes: selectKnownTraitValues(state, 'Node type'),
  knownClades: selectKnownTraitValues(state, 'clade_membership'),
  knownCountries: selectKnownTraitValues(state, 'country'),
  knownDivisions: selectKnownTraitValues(state, 'division'),
  knownRegions: selectKnownTraitValues(state, 'region'),
  knownQcStatuses: selectKnownTraitValues(state, 'QC Status'),
})

const mapDispatchToProps = {
  setTreeFilterPanelCollapsed,
}

export const TreeFilter = connect(mapStateToProps, mapDispatchToProps)(TreeFilterDisconnected)

export interface TreeFilterProps {
  treeFilterPanelCollapsed: boolean
  filters?: Record<string, string[]>
  knownNodeTypes: string[]
  knownClades: string[]
  knownCountries: string[]
  knownDivisions: string[]
  knownRegions: string[]
  knownQcStatuses: string[]
  setTreeFilterPanelCollapsed(collapsed: boolean): void
}

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

export function TreeFilterDisconnected({
  treeFilterPanelCollapsed,
  filters,
  knownNodeTypes,
  knownClades,
  knownCountries,
  knownDivisions,
  knownRegions,
  knownQcStatuses,
  setTreeFilterPanelCollapsed,
}: TreeFilterProps) {
  const { t } = useTranslation()

  const filterBadges = useMemo(() => {
    if (!filters) {
      return []
    }

    return Object.entries(filters).reduce(
      (result, [trait, filters]) =>
        result.concat(
          filters.map((filter) => {
            const traitText = traitTexts.get(trait) ?? ''
            const content = `${traitText}: ${filter}`
            return <FilterBadge key={content}>{content}</FilterBadge>
          }),
        ),
      [] as React.ReactNode[],
    )
  }, [filters])

  return (
    <Collapse isOpen={!treeFilterPanelCollapsed}>
      <Card>
        <CardHeader>
          <CardHeaderText>{t('Tree filter')}</CardHeaderText>
          <CardHeaderBadges>
            <FilterBadgeContainer>{filterBadges}</FilterBadgeContainer>
          </CardHeaderBadges>
        </CardHeader>

        <CardBody>
          <TreeFilterCheckboxGroup name={t('by Node type')} trait="Node type" values={knownNodeTypes} />
          <TreeFilterCheckboxGroup name={t('by Region')} trait="region" values={knownRegions} />
          <TreeFilterCheckboxGroup name={t('by Country')} trait="country" values={knownCountries} />
          <TreeFilterCheckboxGroup name={t('by Admin division')} trait="division" values={knownDivisions} />
          <TreeFilterCheckboxGroup name={t('by Clade')} trait="clade_membership" values={knownClades} />
          <TreeFilterCheckboxGroup name={t('by QC Status')} trait="QC Status" values={knownQcStatuses} />
        </CardBody>
      </Card>
    </Collapse>
  )
}
