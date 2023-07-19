import type { AuspiceJsonV2 } from 'auspice'

import { changeColorBy } from 'auspice/src/actions/colors'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import { useRecoilCallback } from 'recoil'
import { OutputTreesPojo } from 'src/gen'
import { AlgorithmGlobalStatus } from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import {
  geneMapInputAtom,
  primersCsvInputAtom,
  qcConfigInputAtom,
  qrySeqInputsStorageAtom,
  refSeqInputAtom,
  refTreeInputAtom,
  virusPropertiesInputAtom,
} from 'src/state/inputs.state'
import {
  aaMotifsDescsAtom,
  analysisResultAtom,
  analysisResultsAtom,
  analysisStatusGlobalAtom,
  cdsesAtom,
  cladeNodeAttrDescsAtom,
  csvColumnConfigAtom,
  genesAtom,
  genomeSizeAtom,
  phenotypeAttrDescsAtom,
  treeAtom,
  treeNwkAtom,
} from 'src/state/results.state'
import { numThreadsAtom, showNewRunPopupAtom } from 'src/state/settings.state'
import { launchAnalysis, LaunchAnalysisCallbacks, LaunchAnalysisInputs } from 'src/workers/launchAnalysis'

export function useRunAnalysis() {
  const router = useRouter()
  const dispatch = useDispatch()

  return useRecoilCallback(
    ({ set, reset, snapshot }) =>
      () => {
        const { getPromise } = snapshot

        set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.loadingData)
        set(showNewRunPopupAtom, false)

        reset(analysisResultsAtom)

        const numThreads = getPromise(numThreadsAtom)
        const datasetCurrent = getPromise(datasetCurrentAtom)

        const qryInputs = getPromise(qrySeqInputsStorageAtom)
        const csvColumnConfig = getPromise(csvColumnConfigAtom)

        const inputs: LaunchAnalysisInputs = {
          ref_seq_str: getPromise(refSeqInputAtom),
          gene_map_str: getPromise(geneMapInputAtom),
          tree_str: getPromise(refTreeInputAtom),
          qc_config_str: getPromise(qcConfigInputAtom),
          virus_properties_str: getPromise(virusPropertiesInputAtom),
          pcr_primers_str: getPromise(primersCsvInputAtom),
        }

        const callbacks: LaunchAnalysisCallbacks = {
          onGlobalStatus(status) {
            set(analysisStatusGlobalAtom, status)
          },
          onInitialData({
            genes,
            genomeSize,
            cladeNodeAttrKeyDescs,
            phenotypeAttrDescs,
            aaMotifsDescs,
            csvColumnConfig,
          }) {
            set(genesAtom, genes)
            set(
              cdsesAtom,
              genes.flatMap((gene) => gene.cdses),
            )
            set(genomeSizeAtom, genomeSize)
            set(cladeNodeAttrDescsAtom, cladeNodeAttrKeyDescs)
            set(phenotypeAttrDescsAtom, phenotypeAttrDescs)
            set(aaMotifsDescsAtom, aaMotifsDescs)
            set(csvColumnConfigAtom, csvColumnConfig)
          },
          onParsedFasta(/* record */) {
            // TODO: this does not work well: updates in `onAnalysisResult()` callback below fight with this one.
            // Figure out how to make them both work.
            // set(analysisResultsAtom(record.seqName), { index: record.index, seqName: record.seqName })
          },
          onAnalysisResult(result) {
            set(analysisResultAtom(result.index), result)
          },
          onError(error) {
            set(globalErrorAtom, error)
          },
          onTree({ auspice, nwk }: OutputTreesPojo) {
            set(treeAtom, auspice)
            set(treeNwkAtom, nwk)

            const auspiceState = createAuspiceState(auspice as AuspiceJsonV2, dispatch)
            dispatch(auspiceStartClean(auspiceState))
            dispatch(changeColorBy())
            dispatch(treeFilterByNodeType(['New']))
          },
          onComplete() {},
        }

        router
          .push('/results', '/results')
          .then(async () => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.initWorkers)
            return launchAnalysis(qryInputs, inputs, callbacks, datasetCurrent, numThreads, csvColumnConfig)
          })
          .catch((error) => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.failed)
            set(globalErrorAtom, sanitizeError(error))
          })
      },
    [router, dispatch],
  )
}
