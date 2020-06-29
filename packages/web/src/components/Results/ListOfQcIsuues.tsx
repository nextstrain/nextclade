import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { QCResult } from 'src/algorithms/types'

export interface ListOfQcIssuesProps {
  diagnostics: DeepReadonly<QCResult>
}

export function ListOfQcIssues({ diagnostics }: ListOfQcIssuesProps) {
  const { t } = useTranslation()

  let flags
  if (diagnostics.flags.length > 0) {
    flags = diagnostics.flags.map((flag) => {
      return <li key={flag}>{flag}</li>
    })
  } else {
    flags = [<li key="allGood">None detected</li>]
  }

  return (
    <div>
      {t('QC issues:')}
      <ul>{flags}</ul>
    </div>
  )
}
