import React, { ReactNode, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { rgba } from 'polished'
import styled from 'styled-components'
import { TreeIcon } from 'src/components/Tree/TreeIcon'
import { useTreeLinks } from 'src/components/Tree/useTreeLinks'
import { Tooltip } from 'src/components/Results/Tooltip'
import { showOnTreeParamsFromClick } from 'src/components/Results/showOnTreeClick'
import { type ShowOnTreeActions, ShowOnTreeTooltip } from 'src/components/Results/ShowOnTreeTooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { TreeStatus, useTreeStatus } from 'src/hooks/useTreeStatus'
import { shouldZoomTreeToSequenceAtom } from 'src/state/settings.state'

/** Tree statuses in which the tree will not be available, so that the button is not shown */
const TREE_STATUSES_WITHOUT_TREE = new Set<TreeStatus>(['notRun', 'absent', 'failed'])

export interface ButtonShowOnTreeProps {
  index: number
  seqName: string
  /** Whether the filters of the tree page select the sequence, which highlights the button */
  isSelected: boolean
  /** Called when the pointer enters or leaves the button, so that the name cell can hide its own tooltip */
  onHoverChange: (isHovered: boolean) => void
}

/**
 * Button that opens the tree page, filtered to the sequence. A click selects the sequence alone, Shift+click adds it to
 * the selected sequences. A click zooms to the selected sequences or keeps the zoom, as the setting says, and Alt+click
 * does the opposite. The button is highlighted while the sequence is selected, also by the filters of the tree page
 */
export function ButtonShowOnTree({ index, seqName, isSelected, onHoverChange }: ButtonShowOnTreeProps) {
  const { t } = useTranslationSafe()
  const { effectiveDatasetPath } = useEffectiveDataset()
  const treeStatus = useTreeStatus(effectiveDatasetPath)
  const treeLinks = useTreeLinks()
  const shouldZoom = useRecoilValue(shouldZoomTreeToSequenceAtom)
  const [isHovered, setIsHovered] = useState(false)
  const id = useMemo(() => getSafeId('show-on-tree', { index }), [index])

  const onMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHoverChange(true)
  }, [onHoverChange])

  const onMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHoverChange(false)
  }, [onHoverChange])

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      treeLinks?.showSequence(seqName, showOnTreeParamsFromClick(event, shouldZoom)),
    [seqName, shouldZoom, treeLinks],
  )

  if (TREE_STATUSES_WITHOUT_TREE.has(treeStatus)) {
    return null
  }

  const label = t('Show {{name}} on the tree', { name: seqName })
  const actions: ShowOnTreeActions = {
    click: t('Select only this sequence'),
    shiftClick: t('Add this sequence to the selected sequences'),
    zoom: t('Zoom to the selected sequences'),
    zoomNote: t('A click zooms to the selected sequences. You can change this in Settings > Tree.'),
  }
  const isEnabled = treeLinks?.canShowSequence(seqName) ?? false

  let tooltip: ReactNode
  if (!treeLinks) {
    tooltip = t('The tree is available when the analysis is complete')
  } else if (!isEnabled) {
    tooltip = t('This name occurs more than once in the tree, so the tree cannot show this sequence alone')
  } else {
    tooltip = <ShowOnTreeTooltip label={label} actions={actions} shouldZoom={shouldZoom} />
  }

  return (
    <>
      <Button
        id={id}
        type="button"
        aria-label={label}
        aria-description={isEnabled && isSelected ? t('Selected on the tree') : undefined}
        aria-disabled={!isEnabled}
        data-selected={isEnabled && isSelected}
        onClick={isEnabled ? onClick : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <TreeIcon />
      </Button>
      <Tooltip wide target={id} isOpen={isHovered} placement="right">
        {tooltip}
      </Tooltip>
    </>
  )
}

/**
 * Small icon button at the right end of the name cell, so that the buttons of all rows are in one column. It is faint
 * until the name cell is hovered or the button has focus, and highlighted while the sequence is selected
 */
export const Button = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  margin-right: 2px;
  padding: 0 2px;
  border: none;
  border-radius: 3px;
  background: none;
  opacity: 0.35;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.primary};
  }

  &[data-selected='true'] {
    opacity: 1;
    background-color: ${(props) => rgba(props.theme.primary, 0.25)};
    box-shadow: inset 0 0 0 1px ${(props) => props.theme.primary};
  }

  &[aria-disabled='true'] {
    cursor: not-allowed;
  }

  &[aria-disabled='true']:hover {
    opacity: 0.35;
  }
`
