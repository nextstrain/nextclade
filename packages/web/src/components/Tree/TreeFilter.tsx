import React from 'react'

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

import { State } from 'src/state/reducer'
import { setTreeFilterPanelCollapsed } from 'src/state/ui/ui.actions'
import { treeFilterByClade, treeFilterByNodeType, treeFilterByQcStatus } from 'src/state/auspice/auspice.actions'
import { TreeFilterCheckbox } from './TreeFilterCheckbox'
import { FormSection, Label } from './Form'
import AuspiceTree from 'auspice/src/components/tree'
import { AuspiceTreeNode } from 'auspice'
import { notUndefined, notUndefinedOrNull } from 'src/helpers/notUndefined'
import unique from 'fork-ts-checker-webpack-plugin/lib/utils/array/unique'

export const Card = styled(ReactstrapCard)<ReactstrapCardProps>`
  box-shadow: 1px 1px 3px 2px rgba(128, 128, 128, 0.5);
`

export const CardHeader = styled(ReactstrapCardHeader)<ReactstrapCardHeaderProps>`
  background-color: #495057;
  color: #fff;
  height: 36px;
  font-size: 1rem;
  line-height: 1rem;
`

export const CardBody = styled(ReactstrapCardBody)<ReactstrapCardBodyProps>`
  background-color: #495057;
  display: flex;
  width: 100%;
  padding: 3px 3px;
`

function selectKnownClades(state: State) {
  const nodes = state?.tree?.nodes as AuspiceTreeNode[]

  let clades = nodes.map((node) => node.node_attrs?.clade_membership?.value).filter(notUndefinedOrNull) // eslint-disable-line camelcase
  clades = unique(clades)
  clades.sort()

  return clades
}

const mapStateToProps = (state: State) => ({
  treeFilterPanelCollapsed: state.ui.treeFilterPanelCollapsed,
  knownClades: selectKnownClades(state),
})

const mapDispatchToProps = {
  setTreeFilterPanelCollapsed,
  treeFilterByClade,
  treeFilterByQcStatus,
  treeFilterByNodeType,
}

export const TreeFilter = connect(mapStateToProps, mapDispatchToProps)(TreeFilterDisconnected)

export interface TreeFilterProps {
  treeFilterPanelCollapsed: boolean
  knownClades: string[]
  setTreeFilterPanelCollapsed(collapsed: boolean): void
}

export function TreeFilterDisconnected({
  treeFilterPanelCollapsed,
  knownClades,
  setTreeFilterPanelCollapsed,
}: TreeFilterProps) {
  const { t } = useTranslation()

  return (
    <Collapse isOpen={!treeFilterPanelCollapsed}>
      <Card>
        <CardHeader>{t('Results filter')}</CardHeader>

        <CardBody>
          <FormSection>
            <Label>
              {t('By clades')}
              {knownClades.map((clade) => (
                <TreeFilterCheckbox key={clade} text={clade} trait={'clade_membership'} value={clade} />
              ))}
            </Label>
          </FormSection>

          <FormSection>
            <Label>
              {t('By QC status')}
              <TreeFilterCheckbox text={t('Pass')} trait={'QC Status'} value={'Pass'} />
              <TreeFilterCheckbox text={t('Fail')} trait={'QC Status'} value={'Fail'} />
            </Label>
          </FormSection>
        </CardBody>
      </Card>
    </Collapse>
  )
}
