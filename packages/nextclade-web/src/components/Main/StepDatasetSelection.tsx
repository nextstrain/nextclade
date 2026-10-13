import { useRouter } from 'next/router'
import React, { useCallback } from 'react'
import styled from 'styled-components'
import { DatasetCurrent } from 'src/components/Main/DatasetCurrent'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import { DatasetAutosuggestionResultsList } from 'src/components/Main/DatasetSelector'

/**
 * On wide screens, the dataset list and the selected dataset are side by side, and each scrolls on its own.
 * On narrow screens, they are stacked in one column which scrolls as a whole, and the dataset list has limited
 * height, so that the selected dataset and its Run button below it stay reachable.
 */
export function StepDatasetSelection() {
  const { push } = useRouter()
  const toMainPage = useCallback(() => {
    void push('/') // eslint-disable-line no-void
  }, [push])

  return (
    <Container>
      <Column>
        <SequenceListSection>
          <QuerySequenceList toMainPage={toMainPage} />
        </SequenceListSection>
        <DatasetListSection>
          <DatasetAutosuggestionResultsList />
        </DatasetListSection>
      </Column>
      <Column>
        <DatasetCurrent />
      </Column>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;

  @media (min-width: 992px) {
    flex-direction: row;
    overflow: hidden;
  }
`

const Column = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;

  @media (min-width: 992px) {
    flex: 1 1 50%;
    min-width: 0;
    overflow: hidden;
  }
`

const SequenceListSection = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 30vh;
  margin-top: 12px;
  padding: 0 15px;

  @media (min-width: 992px) {
    max-height: 20%;
  }
`

const DatasetListSection = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 70vh;
  min-height: 360px;

  @media (min-width: 992px) {
    flex: 1;
    height: auto;
    min-height: 0;
  }
`
