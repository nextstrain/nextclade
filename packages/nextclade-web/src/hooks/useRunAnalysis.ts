import type { AuspiceJsonV2, CladeNodeAttrDesc } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'
import { concurrent } from 'fasy'
import { isNil } from 'lodash'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import { useRecoilCallback } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { clearAllFiltersAtom } from 'src/state/resultFilters.state'
import { viewedCdsAtom } from 'src/state/seqViewSettings.state'
import { AlgorithmGlobalStatus, AlgorithmInput, Dataset, NextcladeParamsRaw, NextcladeParamsRawDir } from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { datasetCurrentAtom, cdsOrderPreferenceAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import {
  datasetJsonAtom,
  geneMapInputAtom,
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
  currentRefNodeNameAtom,
  genesAtom,
  genomeSizeAtom,
  phenotypeAttrDescsAtom,
  refNodesAtom,
  treeAtom,
  treeNwkAtom,
} from 'src/state/results.state'
import { numThreadsAtom, showNewRunPopupAtom } from 'src/state/settings.state'
import { launchAnalysis, LaunchAnalysisCallbacks, LaunchAnalysisInputs } from 'src/workers/launchAnalysis'
import { axiosFetchRaw } from 'src/io/axiosFetch'

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
        reset(clearAllFiltersAtom)
        reset(treeAtom)
        reset(viewedCdsAtom)
        reset(refNodesAtom)
        reset(currentRefNodeNameAtom)
        reset(cdsOrderPreferenceAtom)

        const numThreads = getPromise(numThreadsAtom)
        const datasetCurrent = getPromise(datasetCurrentAtom)

        const qryInputs = getPromise(qrySeqInputsStorageAtom)
        const csvColumnConfig = getPromise(csvColumnConfigAtom)

        const datasetJsonPromise = getPromise(datasetJsonAtom)

        const inputs: LaunchAnalysisInputs = {
          refSeq: getPromise(refSeqInputAtom),
          geneMap: getPromise(geneMapInputAtom),
          tree: getPromise(refTreeInputAtom),
          virusProperties: getPromise(virusPropertiesInputAtom),
        }

        const callbacks: LaunchAnalysisCallbacks = {
          onGlobalStatus(status) {
            set(analysisStatusGlobalAtom, status)
          },
          onInitialData({
            geneMap,
            genomeSize,
            defaultCds,
            cdsOrderPreference,
            cladeNodeAttrKeyDescs,
            phenotypeAttrDescs,
            refNodes,
            aaMotifsDescs,
            csvColumnConfigDefault,
          }) {
            const genes = Object.values(geneMap.genes)
            set(genesAtom, genes)

            const cdses = Object.values(geneMap.genes).flatMap((gene) => gene.cdses)
            set(cdsesAtom, cdses)
            set(genomeSizeAtom, genomeSize)

            if (defaultCds) {
              set(viewedCdsAtom, defaultCds)
            }

            if (cdsOrderPreference) {
              set(cdsOrderPreferenceAtom, cdsOrderPreference)
            }

            // FIXME: This type is duplicated. One comes from handwritten Auspice typings,
            //  another from JSON-schema generated types
            set(cladeNodeAttrDescsAtom, cladeNodeAttrKeyDescs as unknown as CladeNodeAttrDesc[])
            set(phenotypeAttrDescsAtom, phenotypeAttrDescs)
            set(refNodesAtom, refNodes)
            set(aaMotifsDescsAtom, aaMotifsDescs)
            set(csvColumnConfigAtom, csvColumnConfigDefault)
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
          onTree({ auspice, nwk }) {
            const auspiceState = createAuspiceState(auspice as unknown as AuspiceJsonV2, dispatch)
            dispatch(auspiceStartClean(auspiceState))
            dispatch(changeColorBy())
            dispatch(treeFilterByNodeType(['New']))

            set(treeAtom, auspice as unknown as AuspiceJsonV2)
            set(treeNwkAtom, nwk)
          },
          onComplete() {},
        }

        router
          .push('/results', '/results')
          .then(async () => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.initWorkers)

            const tree = await datasetJsonPromise

            let params: NextcladeParamsRaw
            if (tree) {
              const overridesEntries = [
                { key: 'geneMap', input: inputs.geneMap },
                { key: 'refSeq', input: inputs.refSeq },
                { key: 'tree', input: inputs.tree },
                { key: 'virusProperties', input: inputs.virusProperties },
              ]
              const overrides = await concurrent.map(async ({ key, input }) => {
                const awaitedInput = await input
                if (isNil(awaitedInput)) {
                  return undefined
                }
                return [key, await awaitedInput.getContent()]
              }, overridesEntries)
              const overridesPresent = overrides.filter(notUndefinedOrNull)
              params = { Auspice: { auspiceJson: JSON.stringify(tree), ...Object.fromEntries(overridesPresent) } }
            } else {
              const dataset = await datasetCurrent
              if (!dataset) {
                throw new ErrorInternal('Dataset is required but not found')
              }
              const data = await getParams(inputs, dataset)
              params = { Dir: data }
            }

            return launchAnalysis(qryInputs, params, callbacks, numThreads, csvColumnConfig)
          })
          .catch((error) => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.failed)
            set(globalErrorAtom, sanitizeError(error))
          })
      },
    [router, dispatch],
  )
}

/** Resolves all param inputs into strings */
async function getParams(paramInputs: LaunchAnalysisInputs, dataset: Dataset): Promise<NextcladeParamsRawDir> {
  const entries = [
    { key: 'geneMap', input: paramInputs.geneMap, datasetFileUrl: dataset?.files?.genomeAnnotation },
    { key: 'refSeq', input: paramInputs.refSeq, datasetFileUrl: dataset?.files?.reference },
    { key: 'tree', input: paramInputs.tree, datasetFileUrl: dataset?.files?.treeJson },
    { key: 'virusProperties', input: paramInputs.virusProperties, datasetFileUrl: dataset?.files?.pathogenJson },
  ]

  return Object.fromEntries(
    await concurrent.map(async ({ key, input, datasetFileUrl }) => {
      return [key, await resolveInput(await input, datasetFileUrl)]
    }, entries),
  ) as unknown as NextcladeParamsRawDir
}

async function resolveInput(input: AlgorithmInput | undefined, datasetFileUrl: string | undefined) {
  // If data is provided explicitly, load it
  if (input) {
    return input.getContent()
  }

  // Otherwise fetch corresponding file from the dataset
  if (datasetFileUrl) {
    return axiosFetchRaw(datasetFileUrl)
  }

  return undefined
}
