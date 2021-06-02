import React from 'react'

import { Row, Col } from 'reactstrap'

import { Range } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface PeptideContextProps {
  queryContext: string
  refContext: string
  contextNucRange: Range
}

export function PeptideContext({ queryContext, refContext, contextNucRange }: PeptideContextProps) {
  const { t } = useTranslationSafe()

  const refContextPrettier = refContext.match(/.{1,3}/g)?.join(' ')
  const queryContextPrettier = queryContext.match(/.{1,3}/g)?.join(' ')

  return (
    <>
      <Row>
        <Col>{t('Context range*')}</Col>
        <Col>
          <pre className="my-0">{formatRange(contextNucRange.begin, contextNucRange.end)}</pre>
        </Col>
      </Row>

      <Row>
        <Col>{t('Reference context*')}</Col>
        <Col>
          <pre className="my-0">{refContextPrettier}</pre>
        </Col>
      </Row>

      <Row>
        <Col>{t('Query context*')}</Col>
        <Col>
          <pre className="my-0">{queryContextPrettier}</pre>
        </Col>
      </Row>

      <Row className="mt-2">
        <Col>
          <small>
            {t(
              '* - Displays the nucleotide triplet corresponding to the codon of the mutation, as well as surrounding triplets on the left and right of it (if any)',
            )}
          </small>
        </Col>
      </Row>
    </>
  )
}
