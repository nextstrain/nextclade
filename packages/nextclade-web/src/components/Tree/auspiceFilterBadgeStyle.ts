import { css } from 'styled-components'

/**
 * Centers the icons of Auspice filter badges, for the element that contains the badges.
 *
 * Auspice moves the icons down by a fixed offset, which assumes that the icons sit on the text baseline. Bootstrap
 * aligns all SVGs to the middle of the line instead, so with both styles the icons sit too low and stick out of the
 * badge.
 */
export const auspiceFilterBadgeIconsCentered = css`
  & div:has(> [role='button']) {
    display: inline-flex;
    vertical-align: middle;
    line-height: normal;
  }

  & div:has(> [role='button']) > [role='button'] {
    display: flex;
    align-items: center;
    padding: 0 3px;
  }

  & div:has(> [role='button']) > [role='button'] > svg {
    transform: none;
  }
`
