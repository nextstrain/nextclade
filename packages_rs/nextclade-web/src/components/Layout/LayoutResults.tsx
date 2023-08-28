import React, { PropsWithChildren, HTMLProps } from 'react'
import { Col, Container as ContainerBase, Row } from 'reactstrap'
import styled from 'styled-components'

import { NavigationBar } from './NavigationBar'
import FooterContent from './Footer'
import { UpdateNotification } from './UpdateNotification'

export const FOOTER_HEIGHT = 38

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
  height: calc(100% - ${FOOTER_HEIGHT}px);
`

const ScreenHeightRow = styled(Row)`
  display: flex;
  flex: 0;
  flex-direction: row;
  height: calc(100% - ${FOOTER_HEIGHT}px);
  width: 100%;

  //@media (max-width: 767.98px) {
  //  margin: 0;
  //}
`

const ScreenHeightCol = styled(Col)`
  display: flex;
  width: 100%;
  overflow: hidden;
  padding: 0;
  height: calc(100% - ${FOOTER_HEIGHT}px);

  //@media (max-width: 767.98px) {
  //  margin: 0;
  //}
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
        <ScreenHeightRow>
          <ScreenHeightCol>{children}</ScreenHeightCol>
        </ScreenHeightRow>
      </MainContainer>

      <FooterContainer>
        <FooterContent />
      </FooterContainer>
    </Container>
  )
}
