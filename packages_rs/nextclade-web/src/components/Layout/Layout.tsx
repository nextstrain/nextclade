import React, { PropsWithChildren, HTMLProps } from 'react'
import styled from 'styled-components'

import { NavigationBar } from './NavigationBar'
import { Footer } from './Footer'
import { UpdateNotification } from './UpdateNotification'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
`

const HeaderWrapper = styled.header`
  height: 45px;
`

const MainWrapper = styled.main`
  flex: auto;
  overflow: hidden;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
`

const FooterWrapper = styled.footer``

export function Layout({ children }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  return (
    <Container>
      <HeaderWrapper>
        <NavigationBar />
      </HeaderWrapper>

      <MainWrapper>
        <UpdateNotification />
        {children}
      </MainWrapper>

      <FooterWrapper>
        <Footer />
      </FooterWrapper>
    </Container>
  )
}
