import type { CSSObjectWithLabel, StylesConfig } from 'react-select'
import { VIEWPORT_PADDING } from 'src/helpers/viewport'

export type PortalStyleArgs = Parameters<NonNullable<StylesConfig['menuPortal']>>[1]

/**
 * Style of a portalled `react-select` menu container, which records the right edge of the select control.
 *
 * Use together with `selectMenuInViewport()`.
 */
export function selectMenuPortalInViewport(base: CSSObjectWithLabel, { rect }: PortalStyleArgs): CSSObjectWithLabel {
  return { ...base, '--select-control-right': `${rect.left + rect.width}px` }
}

/**
 * Style of a portalled `react-select` menu, which is wide enough for its options and stays inside the viewport.
 *
 * The menu is at least as wide as the select control, at most as wide as the viewport, and is aligned to the right edge
 * of the control. When the control is too close to the left edge of the viewport, the menu shifts right.
 */
export function selectMenuInViewport(base: CSSObjectWithLabel): CSSObjectWithLabel {
  return {
    ...base,
    left: 'auto',
    right: 0,
    width: 'max-content',
    minWidth: '100%',
    maxWidth: `calc(100vw - ${2 * VIEWPORT_PADDING}px)`,
    transform: `translateX(max(0px, calc(${VIEWPORT_PADDING}px - var(--select-control-right) + 100%)))`,
  }
}
