import React from 'react'
import { TeamCredits } from 'src/components/About/TeamCredits'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import AboutContent from './AboutContent.mdx'

export function AboutPage() {
  const { t } = useTranslationSafe()

  return (
    <Layout>
      <Container>
        <ContentWrapper>
          <Main>
            <H3>{t('About')}</H3>

            <AboutContent />

            <TeamCredits />
          </Main>
        </ContentWrapper>
      </Container>
    </Layout>
  )
}

const Container = styled.div`
  margin: 0 auto;
  padding: 0.8rem 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: auto;
`

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  max-width: ${(props) => props.theme.containerMaxWidths.lg};
  margin: 0 auto;
`

const H3 = styled.h3`
  display: flex;
  flex: 0;
  margin: auto;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
`
