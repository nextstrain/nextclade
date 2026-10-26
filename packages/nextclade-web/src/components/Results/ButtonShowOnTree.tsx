import React, { useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { TreeIcon } from 'src/components/Tree/TreeIcon'
import { useTreeLinks } from 'src/components/Tree/useTreeLinks'
import { showOnTreeParamsFromClick } from 'src/components/Results/showOnTreeClick'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { TreeStatus, useTreeStatus } from 'src/hooks/useTreeStatus'
import { shouldZoomTreeToSequenceAtom } from 'src/state/settings.state'

/** Tree statuses in which the tree will not be available, so that the button is not shown */
const TREE_STATUSES_WITHOUT_TREE = new Set<TreeStatus>(['notRun', 'absent', 'failed'])

export interface ButtonShowOnTreeProps {
  seqName: string
}

/**
 * Button that opens the tree page, filtered to the sequence. A click selects the sequence alone, Shift+click adds it to
 * the selected sequences. A click zooms to the selected sequences or keeps the zoom, as the setting says, and Alt+click
 * does the opposite
 */
export function ButtonShowOnTree({ seqName }: ButtonShowOnTreeProps) {
  const { t } = useTranslationSafe()
  const { effectiveDatasetPath } = useEffectiveDataset()
  const treeStatus = useTreeStatus(effectiveDatasetPath)
  const treeLinks = useTreeLinks()
  const shouldZoom = useRecoilValue(shouldZoomTreeToSequenceAtom)

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      treeLinks?.showSequence(seqName, showOnTreeParamsFromClick(event, shouldZoom)),
    [seqName, shouldZoom, treeLinks],
  )

  if (TREE_STATUSES_WITHOUT_TREE.has(treeStatus)) {
    return null
  }

  const label = t('Show {{name}} on the tree', { name: seqName })
  if (!treeLinks) {
    return (
      <Button type="button" aria-label={label} aria-disabled title={t('The tree is available when the analysis is complete')}>
        <TreeIcon />
      </Button>
    )
  }
  if (!treeLinks.canShowSequence(seqName)) {
    return (
      <Button
        type="button"
        aria-label={label}
        aria-disabled
        title={t('This name occurs more than once in the tree, so the tree cannot show this sequence alone')}
      >
        <TreeIcon />
      </Button>
    )
  }
  return (
    <Button type="button" aria-label={label} title={label} onClick={onClick}>
      <TreeIcon />
    </Button>
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
