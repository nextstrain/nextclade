import React from 'react'

import { round } from 'lodash'
import { useTranslation } from 'react-i18next'

import type { QCResult } from 'src/algorithms/QC/runQC'
import { notUndefined } from 'src/helpers/notUndefined'
import { formatQCDivergence } from 'src/helpers/formatQCDivergence'
import { formatQCSNPClusters } from 'src/helpers/formatQCSNPClusters'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'

export interface ListOfQcIssuesProps {
  qc: QCResult
}

export function ListOfQcIssues({ qc }: ListOfQcIssuesProps) {
  const { t } = useTranslation()

  const { score, divergence, snpClusters, mixedSites, missingData } = qc

  const messages = [
    formatQCDivergence(t, divergence),
    formatQCSNPClusters(t, snpClusters),
    formatQCMixedSites(t, mixedSites),
    formatQCMissingData(t, missingData),
  ].filter(notUndefined)

  let issues: React.ReactNode = <li>{t('None detected')}</li>
  if (score > 0) {
    issues = messages.map((flag) => {
      return <li key={flag}>{flag}</li>
    })
  }

  return (
    <>
      <div>{t('QC score: {{score}}', { score: round(score) })}</div>
      <div>
        {t('QC issues:')}
        <ul>{issues}</ul>
      </div>
    </>
  )
}
