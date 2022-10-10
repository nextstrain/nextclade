import React from 'react'

import { MDXProvider } from '@mdx-js/react'
import { Col, Container as ContainerBase, Row } from 'reactstrap'
import styled from 'styled-components'

import { LinkExternal } from 'src/components/Link/LinkExternal'

import CitationMd from './CitationContent.md'

export const Container = styled(ContainerBase)``

export const Paragraph = styled.p`
  margin-bottom: 0;
`

export const Ul = styled.ul`
  padding: 1rem;
`

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

const components = {
  a: LinkExternal,
  p: Paragraph,
  ul: Ul,
  blockquote: Blockquote,
}

export function Citation() {
  return (
    <Container>
      <Row noGutters>
        <Col>
          <MDXProvider components={components}>
            <CitationMd />
          </MDXProvider>
        </Col>
      </Row>
    </Container>
  )
}
