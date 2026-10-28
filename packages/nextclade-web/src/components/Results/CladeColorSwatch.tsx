import { isNil } from 'lodash'
import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import type { CladeColor } from 'src/components/Results/cladeColor'
import { showOnTreeParamsFromClick } from 'src/components/Results/showOnTreeClick'
import { type ShowOnTreeActions, ShowOnTreeTooltip } from 'src/components/Results/ShowOnTreeTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'
import { type TreeLinks, useTreeLinks } from 'src/components/Tree/useTreeLinks'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { shouldZoomTreeToCladeAtom } from 'src/state/settings.state'

export interface CladeColorValueProps {
  /** Id of the DOM element of the button, unique on the page */
  id: string
  /** Attribute of the tree nodes that the column shows, e.g. `clade_membership` */
  attrKey: string
  /** Value of the attribute, which the text shows */
  value: string
  /** How the tree draws the tips with this value, if the tree has a coloring by the attribute */
  color: CladeColor | undefined
  /** Called when the pointer enters or leaves the button, so that the cell can hide its own tooltip */
  onButtonHoverChange?: (isHovered: boolean) => void
}

/**
 * Value of a clade-like attribute, after a circle that looks like the tips of this value on the tree. A click on the
 * circle opens the tree filtered to the value. The text stays plain, so that the user can select it
 */
export function CladeColorValue({ id, attrKey, value, color, onButtonHoverChange }: CladeColorValueProps) {
  const treeLinks = useTreeLinks()

  let swatch: React.ReactNode = null
  if (!isNil(color)) {
    // The tree cannot filter by a value that it treats as missing, such as "unknown"
    swatch =
      color.isKnown && !isNil(treeLinks) ? (
        <CladeColorButton
          id={id}
          attrKey={attrKey}
          value={value}
          color={color}
          treeLinks={treeLinks}
          onHoverChange={onButtonHoverChange}
        />
      ) : (
        <CladeColorSwatch color={color} />
      )
  }

  return (
    <ValueWrapper>
      {swatch}
      <span>{value}</span>
    </ValueWrapper>
  )
}

interface CladeColorButtonProps {
  id: string
  attrKey: string
  value: string
  color: CladeColor
  treeLinks: TreeLinks
  onHoverChange?: (isHovered: boolean) => void
}

/**
 * Button that opens the tree page filtered to a value. A click filters the tree to the value alone, Shift+click adds the
 * value to the filter. A click zooms to the filtered sequences or keeps the zoom, as the setting says, and Alt+click
 * does the opposite
 */
function CladeColorButton({ id, attrKey, value, color, treeLinks, onHoverChange }: CladeColorButtonProps) {
  const { t } = useTranslationSafe()
  const shouldZoom = useRecoilValue(shouldZoomTreeToCladeAtom)
  const [isHovered, setIsHovered] = useState(false)

  const onMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHoverChange?.(true)
  }, [onHoverChange])

  const onMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHoverChange?.(false)
  }, [onHoverChange])

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      treeLinks.showClade(attrKey, value, showOnTreeParamsFromClick(event, shouldZoom)),
    [attrKey, shouldZoom, treeLinks, value],
  )

  const label = t('Show {{name}} on the tree', { name: value })
  const actions: ShowOnTreeActions = useMemo(
    () => ({
      click: t('Filter the tree to {{name}}', { name: value }),
      shiftClick: t('Add {{name}} to the filter of the tree', { name: value }),
      zoom: t('Zoom to the filtered sequences'),
      zoomNote: t('A click zooms to the filtered sequences. You can change this in Settings > Tree.'),
    }),
    [t, value],
  )

  return (
    <>
      <Button
        id={id}
        type="button"
        aria-label={label}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <CladeColorSwatch color={color} />
      </Button>
      <Tooltip wide target={id} isOpen={isHovered} placement="right">
        <ShowOnTreeTooltip label={label} actions={actions} shouldZoom={shouldZoom} />
      </Tooltip>
    </>
  )
}

interface CladeColorSwatchProps {
  color: CladeColor
}

/** Circle that looks like a tree tip: a lighter fill inside an outline of the tip color */
function CladeColorSwatch({ color }: CladeColorSwatchProps) {
  return (
    <Swatch viewBox="0 0 12 12" aria-hidden>
      <circle cx={6} cy={6} r={5} fill={color.fill} stroke={color.stroke} strokeWidth={1.5} />
    </Swatch>
  )
}

const ValueWrapper = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const Swatch = styled.svg`
  display: block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
`

/** Button around the circle, the size of the circle, with an outline when it has keyboard focus */
const Button = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;

  &:hover ${Swatch} circle {
    stroke-width: 2.5;
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.primary};
    outline-offset: 1px;
  }
`
