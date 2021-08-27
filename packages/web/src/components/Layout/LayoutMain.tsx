import React, { PropsWithChildren, HTMLProps } from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { Button } from 'reactstrap'
import { push } from 'connected-next-router'
import { useTranslation } from 'react-i18next'
import { FaCaretRight } from 'react-icons/fa'

import { selectIsDirty } from 'src/state/algorithm/algorithm.selectors'
import { State } from 'src/state/reducer'

import { NavigationBar } from './NavigationBar'
import FooterContent from './Footer'

export const Container = styled.div`
  max-width: 1700px;
  min-width: 500px;
  margin: 0 auto;
`

const Header = styled.header``

const MainContent = styled.main`
  margin: 0;
`

const Footer = styled.footer``

const ButtonToResults = styled(Button)`
  position: absolute;
  z-index: 1000;
  width: 140px;
`

export interface LayoutMainProps extends PropsWithChildren<HTMLProps<HTMLDivElement>> {
  isDirty: boolean

  goToResults(): void
}

const mapStateToProps = (state: State) => ({
  isDirty: selectIsDirty(state),
})

const mapDispatchToProps = {
  goToResults: () => push('/results'),
}

export const LayoutMain = connect(mapStateToProps, mapDispatchToProps)(LayoutMainDisconnected)

export function LayoutMainDisconnected({ children, isDirty, goToResults }: LayoutMainProps) {
  const { t } = useTranslation()

  return (
    <Container>
      <Header>
        <NavigationBar />
      </Header>

      <ButtonToResults hidden={isDirty} color="secondary" onClick={goToResults}>
        {t('To Results')}
        <FaCaretRight />
      </ButtonToResults>

      <MainContent>{children}</MainContent>

      <Footer>
        <FooterContent />
      </Footer>
    </Container>
  )
}
