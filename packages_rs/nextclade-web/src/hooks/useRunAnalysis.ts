import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import { useRecoilCallback } from 'recoil'
import type { AuspiceJsonV2 } from 'auspice'

import { changeColorBy } from 'auspice/src/actions/colors'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { analysisStatusGlobalAtom } from 'src/state/analysisStatusGlobal.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import {
  analysisResultsAtom,
  cladeNodeAttrDescsAtom,
  geneMapAtom,
  genomeSizeAtom,
  treeAtom,
} from 'src/state/results.state'
import { numThreadsAtom, showNewRunPopupAtom } from 'src/state/settings.state'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { LaunchAnalysisInputs, launchAnalysis, LaunchAnalysisCallbacks } from 'src/workers/launchAnalysis'
import {
  qrySeqAtom,
  refSeqInputAtom,
  geneMapInputAtom,
  refTreeInputAtom,
  qcConfigInputAtom,
  virusPropertiesInputAtom,
  primersCsvInputAtom,
} from 'src/state/inputs.state'

export function useRunAnalysis() {
  const router = useRouter()
  const dispatch = useDispatch()

  return useRecoilCallback(
    ({ set, snapshot: { getPromise } }) =>
      () => {
        set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.loadingData)
        set(showNewRunPopupAtom, false)

        const numThreads = getPromise(numThreadsAtom)
        const datasetCurrent = getPromise(datasetCurrentAtom)
        const qrySeq = getPromise(qrySeqAtom)

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
          onInitialData({ geneMap, genomeSize, cladeNodeAttrKeyDescs }) {
            set(geneMapAtom, geneMap)
            set(genomeSizeAtom, genomeSize)
            set(cladeNodeAttrDescsAtom, cladeNodeAttrKeyDescs)
          },
          onParsedFasta(/* record */) {
            // TODO: this does not work well: updates in `onAnalysisResult()` callback below fight with this one.
            // Figure out how to make them both work.
            // set(analysisResultsAtom(record.seqName), { index: record.index, seqName: record.seqName })
          },
          onAnalysisResult(result) {
            set(analysisResultsAtom(result.seqName), result)
          },
          onError(error) {
            set(globalErrorAtom, error)
          },
          onTree(tree: AuspiceJsonV2) {
            set(treeAtom, tree)

            const auspiceState = createAuspiceState(tree, dispatch)
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
            return launchAnalysis(qrySeq, inputs, callbacks, datasetCurrent, numThreads)
          })
          .catch((error) => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.failed)
            set(globalErrorAtom, sanitizeError(error))
          })
      },
    [router, dispatch],
  )
}
