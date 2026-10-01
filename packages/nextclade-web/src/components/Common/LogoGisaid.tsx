import React, { ReactNode } from 'react'

import styled from 'styled-components'

import GisaidLogoBase from 'src/assets/img/gisaid-logo.svg'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export interface LogoGisaidProps {
  className?: string
  children?: ReactNode
}

const Wrapper = styled.div<LogoGisaidProps>`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  font-size: 0.9rem;
  white-space: nowrap;
`

const GisaidLogo = styled(GisaidLogoBase)`
  display: block;
`

export function LogoGisaid(props: LogoGisaidProps) {
  return (
    <Wrapper {...props}>
      <span className="mr-1">{'Enabled by data from '}</span>
      <LinkExternal href="https://www.gisaid.org/">
        <GisaidLogo height={20} />
      </LinkExternal>
    </Wrapper>
  )
}
