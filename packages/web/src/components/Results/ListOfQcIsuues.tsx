import React from 'react'

import { round } from 'lodash'
import { useTranslation } from 'react-i18next'

import type { QCResult } from 'src/algorithms/QC/runQC'
import { notUndefined } from 'src/helpers/notUndefined'
import { formatQCPrivateMutations } from 'src/helpers/formatQCPrivateMutations'
import { formatQCSNPClusters } from 'src/helpers/formatQCSNPClusters'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'

export interface ListOfQcIssuesProps {
  qc: QCResult
}

export function ListOfQcIssues({ qc }: ListOfQcIssuesProps) {
  const { t } = useTranslation()

  const { overallScore, privateMutations, snpClusters, mixedSites, missingData } = qc

  const messages = [
    formatQCMissingData(t, missingData),
    formatQCPrivateMutations(t, privateMutations),
    formatQCMixedSites(t, mixedSites),
    formatQCSNPClusters(t, snpClusters),
  ].filter(notUndefined)

  let issues: React.ReactNode
  if (messages.length > 0) {
    issues = messages.map((flag) => {
      return <li key={flag}>{flag}</li>
    })
  } else {
    issues = <li>{t('None detected')}</li>
  }

  return (
    <>
      <div>{t('Aggregate QC score: {{score}}', { score: round(overallScore) })}</div>
      <div>
        {t('QC issues:')}
        <ul>{issues}</ul>
      </div>
    </>
  )
}
