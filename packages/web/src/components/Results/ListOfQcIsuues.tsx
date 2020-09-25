import React from 'react'

import { round } from 'lodash'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import type { QCResult } from 'src/algorithms/QC/types'
import { notUndefined } from 'src/helpers/notUndefined'
import { formatQCPrivateMutations } from 'src/helpers/formatQCPrivateMutations'
import { formatQCSNPClusters } from 'src/helpers/formatQCSNPClusters'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'
import { Circle, CircleProps } from 'src/components/Results/Circle'

export const QcList = styled.ul`
  padding-left: 0.5rem;
`

export const QcListItemBase = styled.li`
  display: flex;
  list-style-type: none;
  margin-top: 0.5rem;
`

export interface QcListItem extends React.HTMLProps<HTMLDListElement>, CircleProps {}

export function QcListItem({ status, text, children }: QcListItem) {
  return (
    <QcListItemBase>
      <span className="mr-2 align-content-center">
        <Circle status={status} text={text} />
      </span>
      <span>{children}</span>
    </QcListItemBase>
  )
}

export interface ListOfQcIssuesProps {
  qc: QCResult
}

export function ListOfQcIssues({ qc }: ListOfQcIssuesProps) {
  const { t } = useTranslation()
  const { overallScore, overallStatus, privateMutations, snpClusters, mixedSites, missingData } = qc

  const rules = [
    { name: t('Missing Data'), shortName: 'N', value: missingData, message: formatQCMissingData(t, missingData) }, // prettier-ignore
    { name: t('Mixed Sites'), shortName: 'M', value: mixedSites, message: formatQCMixedSites(t, mixedSites) }, // prettier-ignore
    { name: t('Private Mutations'), shortName: 'P', value: privateMutations, message: formatQCPrivateMutations(t, privateMutations) }, // prettier-ignore
    { name: t('Mutation Clusters'), shortName: 'C', value: snpClusters, message: formatQCSNPClusters(t, snpClusters) }, // prettier-ignore
  ].filter((value) => notUndefined(value))

  const issues = rules.map(({ name, shortName, value, message }, i) => {
    if (!value) {
      return undefined
    }

    return (
      <QcListItem key={name} status={value.status} text={shortName}>
        <div>
          <span>
            <b>{name}</b>
          </span>
          <span>{': '}</span>
          <span>{value.status}</span>
        </div>
        {message ?? t('No issues')}
      </QcListItem>
    )
  })

  return (
    <>
      <div>{t('Overall QC score: {{score}}', { score: round(overallScore) })}</div>
      <div>{t('Overall QC status: {{status}}', { status: overallStatus })}</div>
      <div>
        {t('Detailed QC assessment:')}
        <QcList>{issues}</QcList>
      </div>
    </>
  )
}
