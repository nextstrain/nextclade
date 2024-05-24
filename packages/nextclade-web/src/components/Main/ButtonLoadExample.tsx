import { Dataset } from '_SchemaRoot'
import { isEmpty } from 'lodash'
import React, { useCallback } from 'react'
import { Button } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import { shouldRunAutomaticallyAtom, shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'

export function useSetExampleSequences() {
  const { addQryInputs } = useQuerySeqInputs()
  const shouldRunAutomatically = useRecoilValue(shouldRunAutomaticallyAtom)
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsOnDatasetPageAtom)
  const runAnalysis = useRunAnalysis()
  const runAutodetect = useRunSeqAutodetect()

  return useCallback(
    (dataset?: Dataset) => {
      if (dataset) {
        addQryInputs([new AlgorithmInputDefault(dataset)])
        if (shouldSuggestDatasets) {
          runAutodetect()
        }
        if (shouldRunAutomatically) {
          runAnalysis()
        }
      }
    },
    [addQryInputs, runAnalysis, runAutodetect, shouldRunAutomatically, shouldSuggestDatasets],
  )
}

export function ButtonLoadExample({ ...rest }) {
  const { t } = useTranslationSafe()

  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const setExampleSequences = useSetExampleSequences()
  const onClick = useCallback(() => {
    setExampleSequences(datasetCurrent)
  }, [datasetCurrent, setExampleSequences])

  if (isEmpty(datasetCurrent?.files.examples)) {
    return null
  }

  return (
    <Button {...rest} color="link" onClick={onClick} disabled={hasInputErrors || !datasetCurrent}>
      {t('Load example')}
    </Button>
  )
}
