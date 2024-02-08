import React, { ReactNode } from 'react'

import styled from 'styled-components'

import GisaidLogoBase from 'src/assets/img/gisaid-logo.svg'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export interface LogoGisaidProps {
  children?: ReactNode
}

const Wrapper = styled.div<LogoGisaidProps>`
  display: flex;
  font-size: 0.9rem;
`

const GisaidLogo = styled(GisaidLogoBase)`
  margin-bottom: 4px;
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
