import React from 'react'

import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { notUndefined } from 'src/helpers/notUndefined'

import type { QCResults } from 'src/algorithms/QC/runQC'
import type { QCResultTotalMutations } from 'src/algorithms/QC/ruleTotalMutations'
import type { QCResultSNPClusters } from 'src/algorithms/QC/ruleSnpClusters'
import type { QCResultMixedSites } from 'src/algorithms/QC/ruleMixedSites'
import type { QCResultMissingData } from 'src/algorithms/QC/ruleMissingData'

export function formatQCTotalMutations(t: TFunction, totalMutations?: DeepReadonly<QCResultTotalMutations>) {
  if (!totalMutations || totalMutations.score === 0) {
    return undefined
  }

  const { score, totalNumberOfMutations, divergenceThreshold } = totalMutations
  return t('Divergence is too high. Total mutations: {{total}} ({{allowed}} allowed). QC score: {{score}}.', {
    total: totalNumberOfMutations,
    allowed: divergenceThreshold,
    score: round(score),
  })
}

export function formatQCSNPClusters(t: TFunction, snpClusters?: DeepReadonly<QCResultSNPClusters>) {
  if (!snpClusters || snpClusters.score === 0) {
    return undefined
  }

  const { score, totalSNPs, totalSNPsThreshold } = snpClusters
  return t('Too many SNP clusters. Total clusters: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    total: totalSNPs,
    allowed: totalSNPsThreshold,
    score: round(score),
  })
}

export function formatQCMixedSites(t: TFunction, mixedSites?: DeepReadonly<QCResultMixedSites>) {
  if (!mixedSites || mixedSites.score === 0) {
    return undefined
  }

  const { score, totalMixedSites, mixedSitesThreshold } = mixedSites
  return t('Too many mixed sites: Total mixed: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    total: totalMixedSites,
    allowed: mixedSitesThreshold,
    score: round(score),
  })
}

export function formatQCMissingData(t: TFunction, missingData?: DeepReadonly<QCResultMissingData>) {
  if (!missingData || missingData.score === 0) {
    return undefined
  }

  const { score, totalMissing, missingDataThreshold } = missingData
  return t('Too much missing data. Total Ns: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    total: totalMissing,
    allowed: missingDataThreshold,
    score: round(score),
  })
}

export interface ListOfQcIssuesProps {
  diagnostics: DeepReadonly<QCResults>
}

export function ListOfQcIssues({ diagnostics }: ListOfQcIssuesProps) {
  const { t } = useTranslation()

  const { score, totalMutations, snpClusters, mixedSites, missingData } = diagnostics

  const messages = [
    formatQCTotalMutations(t, totalMutations),
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
