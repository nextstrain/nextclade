import { isNil } from 'lodash'
import React, { CSSProperties, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import {
  CLADE_BADGE_TEXT_COLOR,
  type CladeColor,
  type CladeColorStyle,
  getCladeBadgeBackground,
} from 'src/components/Results/cladeColor'
import { showOnTreeParamsFromClick } from 'src/components/Results/showOnTreeClick'
import { type ShowOnTreeActions, ShowOnTreeTooltip } from 'src/components/Results/ShowOnTreeTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'
import { type TreeLinks, useTreeLinks } from 'src/components/Tree/useTreeLinks'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { cladeColorStyleAtom, shouldZoomTreeToCladeAtom } from 'src/state/settings.state'

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
 * Value of a clade-like attribute in the tree color of the value, in the style that Settings > Tree sets: after a circle
 * that looks like the tips of this value on the tree, or in a pale badge with a border in the tree color. A click on the
 * circle or on the badge opens the tree filtered to the value. In the circle style the text stays plain, so that the
 * user can select it
 */
export function CladeColorValue({ id, attrKey, value, color, onButtonHoverChange }: CladeColorValueProps) {
  const style = useRecoilValue(cladeColorStyleAtom)
  const treeLinks = useTreeLinks()

  if (isNil(color) || style === 'none') {
    return (
      <ValueWrapper>
        <span>{value}</span>
      </ValueWrapper>
    )
  }

  // The tree cannot filter by a value that it treats as missing, such as "unknown"
  const buttonProps = color.isKnown && !isNil(treeLinks) ? { id, attrKey, value, treeLinks, onButtonHoverChange } : undefined

  if (style === 'badge') {
    return (
      <ValueWrapper>
        {buttonProps ? (
          <ShowCladeOnTreeButton {...buttonProps} kind="badge">
            <CladeBadge value={value} color={color} />
          </ShowCladeOnTreeButton>
        ) : (
          <CladeBadge value={value} color={color} />
        )}
      </ValueWrapper>
    )
  }

  return (
    <ValueWrapper>
      {buttonProps ? (
        <ShowCladeOnTreeButton {...buttonProps} kind="circle">
          <CladeColorSwatch color={color} />
        </ShowCladeOnTreeButton>
      ) : (
        <CladeColorSwatch color={color} />
      )}
      <span>{value}</span>
    </ValueWrapper>
  )
}

interface ShowCladeOnTreeButtonProps {
  id: string
  attrKey: string
  value: string
  treeLinks: TreeLinks
  onButtonHoverChange?: (isHovered: boolean) => void
  /** What the button shows: the circle or the badge */
  kind: Exclude<CladeColorStyle, 'none'>
  children: React.ReactNode
}

/**
 * Button that opens the tree page filtered to a value. A click filters the tree to the value alone, Shift+click adds the
 * value to the filter. A click zooms to the filtered sequences or keeps the zoom, as the setting says, and Alt+click
 * does the opposite
 */
function ShowCladeOnTreeButton({
  id,
  attrKey,
  value,
  treeLinks,
  onButtonHoverChange,
  kind,
  children,
}: ShowCladeOnTreeButtonProps) {
  const Button = BUTTONS[kind]
  const { t } = useTranslationSafe()
  const shouldZoom = useRecoilValue(shouldZoomTreeToCladeAtom)
  const [isHovered, setIsHovered] = useState(false)

  const onMouseEnter = useCallback(() => {
    setIsHovered(true)
    onButtonHoverChange?.(true)
  }, [onButtonHoverChange])

  const onMouseLeave = useCallback(() => {
    setIsHovered(false)
    onButtonHoverChange?.(false)
  }, [onButtonHoverChange])

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
        {children}
      </Button>
      <Tooltip wide target={id} isOpen={isHovered} placement="right">
        <ShowOnTreeTooltip
          label={label}
          actions={actions}
          shouldZoom={shouldZoom}
          note={t('You can show the tree colors as circles, as badges or not at all in Settings > Tree.')}
        />
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

interface CladeBadgeProps {
  value: string
  color: CladeColor
}

/** Text of a value on a pale background, with a border in the tree color of the value */
function CladeBadge({ value, color }: CladeBadgeProps) {
  // The stylesheet reads the colors of the value, so that the many colors of a column share one CSS class
  const colors = useMemo(
    (): CSSProperties & Record<'--clade-badge-border' | '--clade-badge-background', string> => ({
      '--clade-badge-border': color.stroke,
      '--clade-badge-background': getCladeBadgeBackground(color),
    }),
    [color],
  )
  return <Badge style={colors}>{value}</Badge>
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
const CircleButton = styled.button`
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

/**
 * Badge of a value. The text is dark on any tree color, because the background is the tree color mixed with mostly
 * white
 */
const Badge = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
  padding: 0 4px;
  border: 1px solid var(--clade-badge-border);
  border-radius: 3px;
  background-color: var(--clade-badge-background);
  color: ${CLADE_BADGE_TEXT_COLOR};
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
`

/** Button around the badge, with a thicker border when hovered and an outline when it has keyboard focus */
const BadgeButton = styled.button`
  display: flex;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;

  &:hover ${Badge} {
    box-shadow: inset 0 0 0 1px var(--clade-badge-border);
  }

  &:focus-visible {
    border-radius: 3px;
    outline: 2px solid ${(props) => props.theme.primary};
    outline-offset: 1px;
  }
`

/** Button element of each style that shows a tree color */
const BUTTONS: Record<Exclude<CladeColorStyle, 'none'>, typeof CircleButton> = {
  circle: CircleButton,
  badge: BadgeButton,
}
