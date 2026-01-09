import React, { PropsWithChildren, HTMLProps } from 'react'
import { BrowserWarning } from 'src/components/Common/BrowserWarning'
import { PreviewWarning } from 'src/components/Common/PreviewWarning'
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
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
`

const FooterWrapper = styled.footer`
  z-index: 1001;
`

export interface LayoutProps extends PropsWithChildren<HTMLProps<HTMLDivElement>> {
  noProviders?: boolean // HACK: Loading page is outside of providers, so need to disable some of the functionality
}

export function Layout({ children, noProviders = false }: LayoutProps) {
  if (noProviders) {
    return null
  }

  return (
    <Container>
      <PreviewWarning />
      <BrowserWarning />

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
