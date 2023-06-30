import { useRouter } from 'next/router'
import React, { PropsWithChildren, HTMLProps, useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import { hasRanAtom } from 'src/state/results.state'
import styled from 'styled-components'
import { Button, Container as ContainerBase } from 'reactstrap'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { FaCaretRight } from 'react-icons/fa'

import { NavigationBar } from './NavigationBar'
import FooterContent from './Footer'
import { UpdateNotification } from './UpdateNotification'

export const Container = styled(ContainerBase)`
  max-height: 100vh;
  max-width: ${(props) => props.theme.xl};
  margin: 0 auto;

  @media (max-width: 991.98px) {
    padding-left: 10px;
    padding-right: 10px;
  }

  @media (max-width: 767.98px) {
    padding-left: 5px;
    padding-right: 5px;
  }
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

export function LayoutMain({ children }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  const { t } = useTranslation()
  const router = useRouter()
  const goToResults = useCallback(() => router.push('/results'), [router])
  const hasRan = useRecoilValue(hasRanAtom)

  return (
    <Container>
      <Header>
        <NavigationBar />
      </Header>

      <ButtonToResults hidden={!hasRan} color="secondary" onClick={goToResults}>
        {t('To Results')}
        <FaCaretRight />
      </ButtonToResults>

      <MainContent>
        <UpdateNotification />
        {children}
      </MainContent>

      <Footer>
        <FooterContent />
      </Footer>
    </Container>
  )
}
