import React, { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import type { AlgorithmInput } from 'src/types'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import { RunPanel } from 'src/components/Main/RunPanel'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { qrySeqErrorAtom } from 'src/state/error.state'
import { shouldRunAutomaticallyAtom, shouldSuggestDatasetsAtom } from 'src/state/settings.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'
import { useQuerySeqInputs } from 'src/state/inputs.state'

export function QuerySequenceFilePicker() {
  const { t } = useTranslationSafe()

  const { qryInputs, addQryInputs } = useQuerySeqInputs()
  const qrySeqError = useRecoilValue(qrySeqErrorAtom)

  const { state: shouldRunAutomatically } = useRecoilToggle(shouldRunAutomaticallyAtom)
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsAtom)

  const icon = useMemo(() => <FileIconFasta />, [])

  const runAnalysis = useRunAnalysis()
  const runAutodetect = useRunSeqAutodetect()

  const setSequences = useCallback(
    (inputs: AlgorithmInput[]) => {
      addQryInputs(inputs)
      if (shouldSuggestDatasets) {
        runAutodetect()
      }
      if (shouldRunAutomatically) {
        runAnalysis()
      }
    },
    [addQryInputs, runAnalysis, runAutodetect, shouldRunAutomatically, shouldSuggestDatasets],
  )

  const headerText = useMemo(() => {
    if (qryInputs.length > 0) {
      return t('Add more sequence data')
    }
    return t('Provide sequence data')
  }, [qryInputs.length, t])

  return (
    <Container>
      <Header>
        <FilePicker
          title={headerText}
          icon={icon}
          exampleUrl="https://example.com/sequences.fasta"
          pasteInstructions={t('Enter sequence data in FASTA format')}
          input={undefined}
          error={qrySeqError}
          isInProgress={false}
          onInputs={setSequences}
          multiple
        />
      </Header>

      <Main>
        <QuerySequenceList />
      </Main>

      <Footer>
        <RunPanel />
      </Footer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  margin-left: 10px;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  margin-bottom: 15px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`
