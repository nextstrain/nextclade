import { isNil } from 'lodash'
import { useCallback } from 'react'
import { useRecoilCallback } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { axiosFetch } from 'src/io/axiosFetch'
import { fetchDatasetsIndex } from 'src/io/fetchDatasetsIndex'
import {
  AutodetectRunState,
  allDatasetSuggestionResultsAtom,
  autodetectResultByIndexAtom,
  autodetectResultsAtom,
  autodetectRunStateAtom,
  autodetectShouldSetCurrentDatasetAtom,
  minimizerIndexAtom,
  autodetectErrorAtom,
} from 'src/state/autodetect.state'
import { datasetServerUrlAtom, minimizerIndexVersionAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'
import { qrySeqInputsStorageAtom } from 'src/state/inputs.state'
import type { FindBestDatasetsResult, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { getQueryFasta } from 'src/workers/launchAnalysis'
import { runSeqAutodetect } from 'src/workers/runSeqAutodetect'

export interface AutosuggestionParams {
  shouldSetCurrentDataset?: boolean
}

export function useRunSeqAutodetect(params?: AutosuggestionParams) {
  const suggestAsync = useRunSeqAutodetectAsync(params)
  return useCallback(() => {
    void suggestAsync() // eslint-disable-line no-void
  }, [suggestAsync])
}

export function useRunSeqAutodetectAsync(params?: AutosuggestionParams) {
  return useRecoilCallback(
    ({ set, reset, snapshot }) =>
      async () => {
        const snapshotRelease = snapshot.retain()
        const { getPromise } = snapshot

        const datasetServerUrl = await getPromise(datasetServerUrlAtom)
        if (isNil(datasetServerUrl)) {
          snapshotRelease()
          return undefined
        }

        reset(minimizerIndexAtom)
        reset(autodetectResultsAtom)
        reset(autodetectRunStateAtom)
        reset(autodetectErrorAtom)
        reset(autodetectShouldSetCurrentDatasetAtom)
        reset(allDatasetSuggestionResultsAtom)
        reset(viewedDatasetNameAtom)

        function onResult(results: MinimizerSearchRecord[]) {
          results.forEach((res) => {
            set(autodetectResultByIndexAtom(res.fastaRecord.index), res)
          })
        }

        function onError(error: Error) {
          set(autodetectRunStateAtom, AutodetectRunState.Failed)
          set(autodetectErrorAtom, error)
        }

        // Commit the outcome of the run as one state change, because components read a finished run with no
        // suggestions as "no matching datasets"
        function onSuccess(results: FindBestDatasetsResult) {
          set(allDatasetSuggestionResultsAtom, results)
          set(viewedDatasetNameAtom, results.suggestions[0]?.name)
          set(autodetectShouldSetCurrentDatasetAtom, params?.shouldSetCurrentDataset ?? false)
          set(autodetectRunStateAtom, AutodetectRunState.Done)
        }

        set(autodetectRunStateAtom, AutodetectRunState.Started)

        return Promise.all([getPromise(qrySeqInputsStorageAtom), getPromise(minimizerIndexVersionAtom)])
          .then(async ([qrySeqInputs, minimizerIndexVersion]) => {
            if (!minimizerIndexVersion) {
              throw new ErrorInternal('Tried to run minimizer search without minimizer index available')
            }
            const fasta = await getQueryFasta(qrySeqInputs)
            const minimizerIndex: MinimizerIndexJson = await axiosFetch(minimizerIndexVersion.path)
            set(minimizerIndexAtom, minimizerIndex)

            const index = await fetchDatasetsIndex(datasetServerUrl)

            const results = await runSeqAutodetect(fasta, index, minimizerIndex, onResult)
            onSuccess(results)
            return results
          })
          .catch((error: unknown) => {
            onError(sanitizeError(error))
            throw error
          })
          .finally(() => {
            snapshotRelease()
          })
      },
    [params?.shouldSetCurrentDataset],
  )
}
