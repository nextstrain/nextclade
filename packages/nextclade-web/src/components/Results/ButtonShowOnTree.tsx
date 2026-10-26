import React, { ReactNode, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { TreeIcon } from 'src/components/Tree/TreeIcon'
import { useTreeLinks } from 'src/components/Tree/useTreeLinks'
import { Tooltip } from 'src/components/Results/Tooltip'
import { showOnTreeParamsFromClick } from 'src/components/Results/showOnTreeClick'
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
  /** Called when the pointer enters or leaves the button, so that the name cell can hide its own tooltip */
  onHoverChange: (isHovered: boolean) => void
}

/**
 * Button that opens the tree page, filtered to the sequence. A click selects the sequence alone, Shift+click adds it to
 * the selected sequences. A click zooms to the selected sequences or keeps the zoom, as the setting says, and Alt+click
 * does the opposite
 */
export function ButtonShowOnTree({ index, seqName, onHoverChange }: ButtonShowOnTreeProps) {
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
  const isEnabled = treeLinks?.canShowSequence(seqName) ?? false

  let tooltip: ReactNode
  if (!treeLinks) {
    tooltip = t('The tree is available when the analysis is complete')
  } else if (!isEnabled) {
    tooltip = t('This name occurs more than once in the tree, so the tree cannot show this sequence alone')
  } else {
    tooltip = <ButtonShowOnTreeTooltip label={label} shouldZoom={shouldZoom} />
  }

  return (
    <>
      <Button
        id={id}
        type="button"
        aria-label={label}
        aria-disabled={!isEnabled}
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

interface ButtonShowOnTreeTooltipProps {
  label: string
  shouldZoom: boolean
}

/** Tooltip that lists what a click with each modifier key does */
function ButtonShowOnTreeTooltip({ label, shouldZoom }: ButtonShowOnTreeTooltipProps) {
  const { t } = useTranslationSafe()
  return (
    <>
      <TooltipTitle>{label}</TooltipTitle>
      <ClickTable>
        <tbody>
          <tr>
            <th>{t('Click')}</th>
            <td>{t('Select only this sequence')}</td>
          </tr>
          <tr>
            <th>{t('Shift+click')}</th>
            <td>{t('Add this sequence to the selected sequences')}</td>
          </tr>
          <tr>
            <th>{t('Alt+click')}</th>
            <td>{shouldZoom ? t('Keep the zoom of the tree') : t('Zoom to the selected sequences')}</td>
          </tr>
        </tbody>
      </ClickTable>
      <TooltipNote>
        {shouldZoom
          ? t('A click zooms to the selected sequences. You can change this in Settings > Tree.')
          : t('A click keeps the zoom of the tree. You can change this in Settings > Tree.')}
      </TooltipNote>
    </>
  )
}

/** Small icon button, faint until the name cell is hovered or the button has focus */
export const Button = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
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

  &[aria-disabled='true'] {
    cursor: not-allowed;
  }

  &[aria-disabled='true']:hover {
    opacity: 0.35;
  }
`

const TooltipTitle = styled.p`
  margin-bottom: 0.5rem;
  font-weight: bold;
  overflow-wrap: anywhere;
`

const ClickTable = styled.table`
  margin-bottom: 0.5rem;

  & th {
    padding-right: 1rem;
    white-space: nowrap;
  }
`

const TooltipNote = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${(props) => props.theme.gray600};
`
