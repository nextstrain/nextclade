import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Link } from 'src/components/Link/Link'
import styled from 'styled-components'

export function ExportPageNoDataset() {
  const { t } = useTranslationSafe()

  return (
    <Container>
      <Message>{t('No analysis results available.')}</Message>
      <LinkWrapper>
        <Link href="/">{t('Return to the start page')}</Link>
      </LinkWrapper>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`

const Message = styled.p`
  font-size: 1.1rem;
  color: ${(props) => props.theme.gray600};
  margin-bottom: 1rem;
`

const LinkWrapper = styled.div`
  font-size: 1rem;
`
