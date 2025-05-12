import React, { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import type { AlgorithmInput } from 'src/types'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { qrySeqErrorAtom } from 'src/state/error.state'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { FilePicker } from 'src/components/FilePicker/FilePicker'
import { FileIconFasta } from 'src/components/Common/FileIcons'
import { useQuerySeqInputs } from 'src/state/inputs.state'

export function QuerySequenceFilePicker() {
  const { t } = useTranslationSafe()

  const { addQryInputs } = useQuerySeqInputs()
  const qrySeqError = useRecoilValue(qrySeqErrorAtom)

  const shouldSuggestDatasetsOnDatasetPage = useRecoilValue(shouldSuggestDatasetsOnDatasetPageAtom)

  const icon = useMemo(() => <FileIconFasta />, [])

  const runAutodetect = useRunSeqAutodetect()

  const setSequences = useCallback(
    (inputs: AlgorithmInput[]) => {
      addQryInputs(inputs)
      if (shouldSuggestDatasetsOnDatasetPage) {
        runAutodetect()
      }
    },
    [addQryInputs, runAutodetect, shouldSuggestDatasetsOnDatasetPage],
  )

  return (
    <Container>
      <FilePicker
        icon={icon}
        exampleUrl="https://example.com/sequences.fasta"
        pasteInstructions={t('Enter sequence data in FASTA format')}
        input={undefined}
        error={qrySeqError}
        isInProgress={false}
        onInputs={setSequences}
        multiple
      />
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
`
