import React from 'react'
import styled from 'styled-components'
import { Badge } from 'reactstrap'
import { getVersionStatus } from 'src/components/Main/datasetInfoHelpers'
import { TFunc } from 'src/helpers/useTranslationSafe'
import type { DatasetVersion } from 'src/types'

export interface DatasetTagBadgeProps {
  tag: string
  versions: DatasetVersion[]
  t: TFunc
}

export function DatasetTagBadge({ tag, versions, t }: DatasetTagBadgeProps) {
  const status = getVersionStatus(tag, versions, t)
  return <VersionBadge color={status.color}>{status.label}</VersionBadge>
}

const VersionBadge = styled(Badge)`
  font-size: 0.65rem;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  flex-shrink: 0;
`
