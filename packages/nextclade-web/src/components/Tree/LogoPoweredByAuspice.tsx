import React from 'react'

import styled from 'styled-components'
import LogoAuspiceSvg from 'src/assets/img/auspice-logo.svg'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export const LogoPoweredByAuspiceContainer = styled(LinkExternal)`
  margin: 5px 10px;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  &:active,
  &:hover,
  &:focus,
  &:focus-within {
    text-decoration: none;
  }
`

export const TextPoweredBy = styled.div`
  color: ${(props) => props.theme.bodyColor};
  margin-left: auto;
  font-size: 0.85rem;
`

export const LogoAuspiceContainer = styled.div`
  display: inline-flex;
  height: 100%;
  border: 1px solid #888;
  border-radius: 5px;
  padding: 10px 10px;
`

export const LogoAuspice = styled(LogoAuspiceSvg)`
  flex-basis: 40px;
  width: 100%;
  height: 100%;
  margin: auto;
`

export const TextAuspiceContainer = styled.div`
  margin-left: 15px;
`

export const TextAuspice = styled.span`
  flex: 1;
  color: ${(props) => props.theme.bodyColor};
  font-size: 1.75rem;
`

export const TextNextstrain = styled.div`
  display: block;
  color: ${(props) => props.theme.bodyColor};
  font-size: 0.75rem;
  line-height: 0.75rem;
`

export function LogoPoweredByAuspice() {
  return (
    <LogoPoweredByAuspiceContainer href="https://nextstrain.org">
      <TextPoweredBy>{'Powered by'}</TextPoweredBy>

      <LogoAuspiceContainer>
        <LogoAuspice width={40} height={40} />
        <TextAuspiceContainer>
          <TextAuspice>{'Auspice'}</TextAuspice>
          <TextNextstrain>{'the Nextstrain project'}</TextNextstrain>
        </TextAuspiceContainer>
      </LogoAuspiceContainer>
    </LogoPoweredByAuspiceContainer>
  )
}
