import React from 'react'

import { Table as ReactstrapTable } from 'reactstrap'
import styled from 'styled-components'

import { Range } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export const Table = styled(ReactstrapTable)`
  margin-bottom: 2px;

  & td {
    padding: 0 0.5rem;
  }

  & tr {
    margin: 0;
    padding: 0;
  }
`

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
      <tr>
        <td>{t('Reference context*')}</td>
        <td>
          <pre className="my-0">{refContextPrettier}</pre>
        </td>
      </tr>

      <tr>
        <td>{t('Query context*')}</td>
        <td>
          <pre className="my-0">{queryContextPrettier}</pre>
        </td>
      </tr>

      <tr>
        <td>{t('Context range*')}</td>
        <td>
          <pre className="my-0">{formatRange(contextNucRange.begin, contextNucRange.end)}</pre>
        </td>
      </tr>
    </>
  )
}
