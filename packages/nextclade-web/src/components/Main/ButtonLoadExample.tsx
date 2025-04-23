import { Dataset } from '_SchemaRoot'
import React, { useCallback, useMemo } from 'react'
import { Button } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'

export function useSetExampleSequences() {
  const { addQryInputs } = useQuerySeqInputs()
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsOnDatasetPageAtom)
  const runAutodetect = useRunSeqAutodetect()

  return useCallback(
    (dataset?: Dataset) => {
      if (dataset) {
        addQryInputs([new AlgorithmInputDefault(dataset)])
        if (shouldSuggestDatasets) {
          runAutodetect()
        }
      }
    },
    [addQryInputs, runAutodetect, shouldSuggestDatasets],
  )
}

export function ButtonLoadExample({ dataset, ...rest }: { dataset?: Dataset }) {
  const { t } = useTranslationSafe()

  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const setExampleSequences = useSetExampleSequences()
  const onClick = useCallback(() => {
    setExampleSequences(dataset)
  }, [dataset, setExampleSequences])

  const title = useMemo(
    () =>
      dataset?.files?.examples
        ? t('Load example sequence data (for demonstration)')
        : t('There is no example data in this dataset'),
    [dataset?.files?.examples, t],
  )

  return (
    <ButtonStyled
      {...rest}
      color="link"
      onClick={onClick}
      title={title}
      disabled={!dataset?.files?.examples || hasInputErrors || !dataset}
    >
      {t('Load example')}
    </ButtonStyled>
  )
}

const ButtonStyled = styled(Button)`
  margin: 0 0.5rem;
  max-width: 300px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  &:disabled {
    text-decoration: none !important;
    pointer-events: all !important;
    cursor: not-allowed !important;
    transition: none !important;
  }

  transition: none !important;
`
