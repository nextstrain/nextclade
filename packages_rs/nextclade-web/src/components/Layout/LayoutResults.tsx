import React, { PropsWithChildren, HTMLProps } from 'react'

import styled from 'styled-components'

import { NavigationBar } from './NavigationBar'
import FooterContent from './Footer'
import { UpdateNotification } from './UpdateNotification'

export const LayoutContainer = styled.div`
  max-width: 100vw;
  max-height: 100vh;
  margin: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  flex-shrink: 0;
`

const MainContent = styled.main`
  flex-grow: 1;
  flex-basis: 100%;
  min-height: 2em;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export function LayoutResults({ children }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  return (
    <LayoutContainer>
      <Header>
        <NavigationBar />
      </Header>

      <MainContent>
        <UpdateNotification />
        {children}
      </MainContent>

      <Footer>
        <FooterContent />
      </Footer>
    </LayoutContainer>
  )
}
