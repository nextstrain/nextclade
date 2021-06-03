import React from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { push } from 'connected-next-router'

import type { State } from 'src/state/reducer'
import type { PanelButtonProps } from 'src/components/Results/PanelButton'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { PanelButton } from 'src/components/Results/PanelButton'
import { TreeIcon } from 'src/components/Tree/TreeIcon'

const IconContainer = styled.span`
  margin-right: 0.5rem;
`

const mapStateToProps = (state: State) => ({
  hasTree: state.algorithm.status === AlgorithmGlobalStatus.done && state.algorithm.treeStr !== undefined,
})

const mapDispatchToProps = {
  showTree: () => push('/tree'),
}

export const ButtonTree = connect(mapStateToProps, mapDispatchToProps)(ButtonTreeDisconnected)

export interface ButtonTreeProps extends PanelButtonProps {
  hasTree: boolean

  showTree(_0: void): void
}

export function ButtonTreeDisconnected({ showTree, hasTree }: ButtonTreeProps) {
  const { t } = useTranslation()
  const text = t('Show phylogenetic tree')

  return (
    <PanelButton onClick={showTree} disabled={!hasTree} title={text}>
      <IconContainer>
        <TreeIcon />
      </IconContainer>
    </PanelButton>
  )
}
