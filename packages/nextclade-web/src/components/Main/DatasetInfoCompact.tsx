import React, { useMemo } from 'react'
import styled from 'styled-components'
import { formatDatasetInfo } from 'src/components/Main/DatasetInfo'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import type { Dataset } from 'src/types'

export const Container = styled.div`
  display: flex;
  flex: 1;
  margin: 0;
`

export const FlexRight = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 0.25rem;
  width: 0;
`

export const DatasetName = styled.h4.attrs(({ color }) => ({
  style: { color },
}))`
  font-size: 1rem;
  margin-bottom: 0;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DatasetInfoLine = styled.span`
  font-size: 0.75rem;
  padding: 0;
  margin: 0;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:after {
    content: ' ';
    white-space: pre;
  }
`

export interface DatasetInfoProps {
  dataset: Dataset
}

export function DatasetInfoCompact({ dataset, ...restProps }: DatasetInfoProps) {
  const { t } = useTranslationSafe()

  const { datasetName, datasetRef, datasetUpdatedAt, datasetPath, color } = useMemo(
    () => formatDatasetInfo(dataset, t),
    [dataset, t],
  )

  return (
    <Container {...restProps}>
      <FlexRight>
        <DatasetName title={datasetName} color={color}>
          {datasetName}
        </DatasetName>

        <DatasetInfoLine title={datasetRef}>{datasetRef}</DatasetInfoLine>
        <DatasetInfoLine title={datasetUpdatedAt}>{datasetUpdatedAt}</DatasetInfoLine>
        <DatasetInfoLine title={datasetPath}>{datasetPath}</DatasetInfoLine>
      </FlexRight>
    </Container>
  )
}
