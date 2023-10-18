import React from 'react'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export const Container = styled.div`
  display: flex;
  padding: 15px;
  box-shadow: 0 0 12px 0 #0002;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  width: 100%;
`

export interface DatasetListEntryProps {
  dataset: Dataset
  showSuggestions?: boolean
}

export function DatasetListEntry({ dataset, showSuggestions }: DatasetListEntryProps) {
  return (
    <Container>
      <DatasetInfo dataset={dataset} showSuggestions={showSuggestions} />
    </Container>
  )
}
