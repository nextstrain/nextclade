import React, { Props } from 'react'

import { StrictOmit } from 'ts-essentials'
import styled from 'styled-components'

import { ReactComponent as GisaidLogoBase } from 'src/assets/img/gisaid-logo.svg'
import { LinkExternal } from 'src/components/Link/LinkExternal'

const Wrapper = styled.div`
  display: flex;
  font-size: 0.9rem;
`

const GisaidLogo = styled(GisaidLogoBase)`
  margin-bottom: 4px;
`

export type LogoGisaidProps = StrictOmit<Props<HTMLDivElement>, 'ref'>

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
