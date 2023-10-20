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
  z-index: 1001;
`

const MainInner = styled.main`
  display: flex;
  flex: 1;
  overflow: hidden;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
`

const MainOuter = styled.main`
  flex: auto;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
`

const FooterWrapper = styled.footer`
  z-index: 1001;
`

export function Layout({ children }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  return (
    <Container>
      <HeaderWrapper>
        <NavigationBar />
      </HeaderWrapper>

      <MainOuter>
        <UpdateNotification />
        <MainInner>{children}</MainInner>
      </MainOuter>

      <FooterWrapper>
        <Footer />
      </FooterWrapper>
    </Container>
  )
}
