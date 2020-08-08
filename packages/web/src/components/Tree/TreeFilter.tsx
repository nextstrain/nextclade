import React from 'react'

import { get, uniq } from 'lodash'

import {
  Card as ReactstrapCard,
  CardBody as ReactstrapCardBody,
  CardHeader as ReactstrapCardHeader,
  CardBodyProps as ReactstrapCardBodyProps,
  CardHeaderProps as ReactstrapCardHeaderProps,
  CardProps as ReactstrapCardProps,
  CardFooter as ReactstrapCardFooter,
  CardFooterProps as ReactstrapCardFooterProps,
  Collapse,
} from 'reactstrap'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { State } from 'src/state/reducer'
import { setTreeFilterPanelCollapsed } from 'src/state/ui/ui.actions'
import { notUndefined } from 'src/helpers/notUndefined'
import { TreeFilterCheckboxGroup } from 'src/components/Tree/TreeFilterCheckboxGroup'
import { UNKNOWN_VALUE } from 'src/constants'
import { FilterBadges } from 'src/components/Tree/FilterBadges'

export const Card = styled(ReactstrapCard)<ReactstrapCardProps>`
  box-shadow: none;
`

export const CardHeader = styled(ReactstrapCardHeader)<ReactstrapCardHeaderProps>`
  display: flex;
  width: 100%;
  background-color: #30353f;
  color: #fff;
  font-size: 1.25rem;
  padding: 10px 16px;
`

export const CardBody = styled(ReactstrapCardBody)<ReactstrapCardBodyProps>`
  display: flex;
  width: 100%;
  background-color: #30353f;
  padding: 0px 3px;
`

export const CardHeaderText = styled.div`
  flex: 0 0;
  white-space: nowrap;
`

export const CardHeaderBadges = styled.div`
  flex: 1;
  flex-wrap: wrap;
`

export const CardFooter = styled(ReactstrapCardFooter)<ReactstrapCardFooterProps>`
  background-color: #30353f;
  padding: 4px 6px;

  &:last-child {
    border-radius: 0;
  }
`

export const FooterText = styled.p`
  font-size: 0.7rem;
  color: #fff;
`

export function moveToFirst<T>(arr: T[], value: T) {
  if (arr.includes(value)) {
    const others = arr.filter((x) => x !== value)
    return [value, ...others]
  }
  return arr
}

export function selectKnownTraitValues(state: State, trait: string) {
  const nodes = state.tree?.nodes ?? []
  const valuesRaw = nodes.map((node) => get(node, `node_attrs.${trait}.value`) as string | undefined) || []
  let values = valuesRaw.filter(notUndefined)
  values = uniq(values)
  values.sort()
  values = moveToFirst(values, UNKNOWN_VALUE)
  return values ?? []
}

const mapStateToProps = (state: State) => ({
  treeFilterPanelCollapsed: state.ui.treeFilterPanelCollapsed,
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

  knownNodeTypes: string[]
  knownClades: string[]
  knownCountries: string[]
  knownDivisions: string[]
  knownRegions: string[]
  knownQcStatuses: string[]
  setTreeFilterPanelCollapsed(collapsed: boolean): void
}

export function TreeFilterDisconnected({
  treeFilterPanelCollapsed,
  knownNodeTypes,
  knownClades,
  knownCountries,
  knownDivisions,
  knownRegions,
  knownQcStatuses,
  setTreeFilterPanelCollapsed,
}: TreeFilterProps) {
  const { t } = useTranslation()

  return (
    <Collapse isOpen={!treeFilterPanelCollapsed}>
      <Card>
        <CardHeader>
          <CardHeaderText>{t('Tree filter')}</CardHeaderText>
          <CardHeaderBadges>
            <FilterBadges />
          </CardHeaderBadges>
        </CardHeader>

        <CardBody>
          <TreeFilterCheckboxGroup name={t('by Region')} trait="region" values={knownRegions} />
          <TreeFilterCheckboxGroup name={t('by Country')} trait="country" values={knownCountries} />
          <TreeFilterCheckboxGroup name={t('by Admin division')} trait="division" values={knownDivisions} />
          <TreeFilterCheckboxGroup name={t('by Node type')} trait="Node type" values={knownNodeTypes} />
          <TreeFilterCheckboxGroup name={t('by Clade')} trait="clade_membership" values={knownClades} />
          <TreeFilterCheckboxGroup name={t('by QC Status')} trait="QC Status" values={knownQcStatuses} />
        </CardBody>
        <CardFooter>
          <FooterText>
            {t(
              '* "Unknown" country, division and region are automatically assigned to the new nodes. When filtering, make sure to tick the "Unknown" entry in order to display these nodes.',
            )}
          </FooterText>
        </CardFooter>
      </Card>
    </Collapse>
  )
}
