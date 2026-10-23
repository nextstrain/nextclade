import { css } from 'styled-components'

/**
 * Centers the icons of Auspice filter badges, for the element that contains the badges.
 *
 * Auspice moves the icons down by a fixed offset, which assumes that the icons sit on the text baseline. Bootstrap
 * aligns all SVGs to the middle of the line instead, so with both styles the icons sit too low and stick out of the
 * badge.
 *
 * A badge is a container of `div` buttons without `aria-expanded`, which tells it apart from the section headers of the
 * sidebar (expandable buttons) and from the zoom buttons of the map (links)
 */
export const auspiceFilterBadgeIconsCentered = css`
  & div:has(> div[role='button']:not([aria-expanded])) {
    display: inline-flex;
    vertical-align: middle;
    line-height: normal;
  }

  & div:has(> div[role='button']:not([aria-expanded])) > div[role='button'] {
    display: flex;
    align-items: center;
    padding: 0 3px;
  }

  & div:has(> div[role='button']:not([aria-expanded])) > div[role='button'] > svg {
    transform: none;
  }
`
