import React from 'react'
import { Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export const Blockquote = styled.blockquote`
  margin-bottom: 0.33rem;
  padding: 6px 8px;
  border-radius: 3px;
  background-color: #eae9e3;
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.8rem;

  // wrap more aggressively on mobile
  @media (max-width: 992px) {
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
`

export function Citation() {
  const { t } = useTranslationSafe()

  return (
    <Container>
      <Row noGutters>
        <Col>
          <p className="mb-1">
            {t('If you use results obtained with Nextclade in a publication, please add citation to our paper:')}
          </p>

          <Blockquote>
            {'Aksamentov, I., Roemer, C., Hodcroft, E. B., & Neher, R. A., (2021). ' +
              'Nextclade: clade assignment, mutation calling and quality control for viral genomes. ' +
              'Journal of Open Source Software, 6(67), 3773, '}
            <LinkExternal href="https://doi.org/10.21105/joss.03773">
              {'https://doi.org/10.21105/joss.03773'}
            </LinkExternal>
          </Blockquote>

          <p className="mt-3 mb-1">
            {t('Download bibtex fragment: ')}
            <LinkExternal href="/citation.bib" download>
              {'citation.bib'}
            </LinkExternal>
          </p>

          <p className="mt-3 mb-1">{t('Where possible, please additionally provide a link to Nextclade Web:')}</p>

          <Blockquote>{'https://clades.nextstrain.org'}</Blockquote>
        </Col>
      </Row>
    </Container>
  )
}
