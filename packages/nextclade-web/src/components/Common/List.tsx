import styled, { css } from 'styled-components'

export const Ul = styled.ul`
  padding-left: 1.5rem;
`

export const Li = styled.li``

export const UlInvisible = styled.ul`
  padding-left: 0;
`

export const LiInvisible = styled.li`
  list-style: none;
`

// @formatter:off
// prettier-ignore
export const ScrollShadowVerticalCss = css`
  /** Taken from: https://css-tricks.com/books/greatest-css-tricks/scroll-shadows */
  background:
    /* Shadow Cover TOP */    linear-gradient(white 30%, rgba(255, 255, 255, 0)) center top,
    /* Shadow Cover BOTTOM */ linear-gradient(rgba(255, 255, 255, 0), white 70%) center bottom,
    /* Shadow TOP */          radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0)) center top,
    /* Shadow BOTTOM */       radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0)) center bottom;
  background-repeat: no-repeat;
  background-size: 100% 40px, 100% 40px, 100% 14px, 100% 14px;
  background-attachment: local, local, scroll, scroll;
`
// @formatter:on

export const ListGenericCss = css`
  ${ScrollShadowVerticalCss};
  list-style: none;
  padding: 0;
  margin: 0;
  -webkit-overflow-scrolling: touch;
  overflow-scrolling: touch;

  & li {
    border: 0;
  }
`

export const UlGeneric = styled.ul`
  ${ListGenericCss}
`
