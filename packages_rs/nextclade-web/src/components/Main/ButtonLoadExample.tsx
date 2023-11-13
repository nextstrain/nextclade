import React, { useCallback } from 'react'
import { Button } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasInputErrorsAtom } from 'src/state/error.state'
import { useQuerySeqInputs } from 'src/state/inputs.state'

export function ButtonLoadExample({ ...rest }) {
  const { t } = useTranslationSafe()

  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const { addQryInputs } = useQuerySeqInputs()
  const hasInputErrors = useRecoilValue(hasInputErrorsAtom)
  // const shouldRunAutomatically = useRecoilValue(shouldRunAutomaticallyAtom)
  // const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsAtom)
  // const runAnalysis = useRunAnalysis()
  // const runAutodetect = useRunSeqAutodetect()

  const setExampleSequences = useCallback(() => {
    if (datasetCurrent) {
      addQryInputs([new AlgorithmInputDefault(datasetCurrent)])
      // if (shouldSuggestDatasets) {
      //   runAutodetect()
      // }
      // if (shouldRunAutomatically) {
      //   runAnalysis()
      // }
    }
  }, [addQryInputs, datasetCurrent])

  return (
    <Button {...rest} color="link" onClick={setExampleSequences} disabled={hasInputErrors || !datasetCurrent}>
      {t('Load example')}
    </Button>
  )
}
