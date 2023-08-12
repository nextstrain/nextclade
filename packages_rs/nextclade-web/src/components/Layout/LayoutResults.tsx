import React, { PropsWithChildren, HTMLProps } from 'react'
import { Container as ContainerBase } from 'reactstrap'
import styled from 'styled-components'

import { NavigationBar } from './NavigationBar'
import FooterContent from './Footer'
import { UpdateNotification } from './UpdateNotification'

const FOOTER_HEIGHT = 38

const Container = styled(ContainerBase)`
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-y: hidden;
`

const HeaderContainer = styled.header`
  position: sticky;
  top: 0;
  width: 100%;
  box-shadow: ${(props) => props.theme.shadows.large};
  margin-bottom: 1rem;
  z-index: 100;
`

const MainContainer = styled.main`
  display: flex;
  flex-direction: column;
  padding-bottom: ${FOOTER_HEIGHT + 10}px;
`

const FooterContainer = styled.footer`
  position: fixed;
  height: ${FOOTER_HEIGHT}px;
  width: 100%;
  bottom: 0;
  padding: 8px 10px;
  box-shadow: ${(props) => props.theme.shadows.large};
  z-index: 100;
  background-color: ${(props) => props.theme.white};
  opacity: 1;
`

export function LayoutResults({ children }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  return (
    <Container fluid>
      <HeaderContainer>
        <NavigationBar />
      </HeaderContainer>

      <MainContainer>
        <UpdateNotification />
        {children}
      </MainContainer>

      <FooterContainer>
        <FooterContent />
      </FooterContainer>
    </Container>
  )
}
