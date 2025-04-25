import React from 'react'
import { useRecoilValue } from 'recoil'
import { UlGeneric } from 'src/components/Common/List'
import { DatasetInfoCompact } from 'src/components/Main/DatasetInfoCompact'
import { isAutodetectRunningAtom, topSuggestedDatasetsAtom } from 'src/state/autodetect.state'
import styled from 'styled-components'

export function DatasetMultiList() {
  const datasets = useRecoilValue(topSuggestedDatasetsAtom)
  const isRunning = useRecoilValue(isAutodetectRunningAtom)
  return (
    <Ul isBusy={isRunning}>
      {datasets?.map((dataset) => (
        <Li key={dataset.path}>
          <DatasetInfoCompact dataset={dataset} />
        </Li>
      ))}
    </Ul>
  )
}

const Ul = styled(UlGeneric)<{ isBusy: boolean }>`
  flex: 1;
  overflow: auto;
  max-height: 320px;
  opacity: ${({ isBusy }) => (isBusy ? 0.5 : 1)};
`

const Li = styled.li`
  margin: 5px 0;

  text-overflow: ellipsis;
  white-space: nowrap;

  border-bottom: 1px solid #ccc !important;

  &:last-child {
    border-bottom: none !important;
  }
`
