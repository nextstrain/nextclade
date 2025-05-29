import type { AuspiceJsonV2 } from 'auspice'
import { concurrent } from 'fasy'
import { isEmpty, isNil, omitBy } from 'lodash'
import pProps from 'p-props'
import { useRouter } from 'next/router'
import { useRecoilCallback } from 'recoil'
import { REF_NODE_CLADE_FOUNDER, REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import {
  seqIndexToTopDatasetNameAtom,
  seqIndicesWithoutDatasetSuggestionsAtom,
  topSuggestedDatasetsAtom,
} from 'src/state/autodetect.state'
import { clearAllFiltersAtom } from 'src/state/resultFilters.state'
import { allViewedCdsAtom, viewedCdsAtom } from 'src/state/seqViewSettings.state'
import {
  AlgorithmGlobalStatus,
  AlgorithmInput,
  AuspiceTree,
  Dataset,
  NextcladeParamsRaw,
  NextcladeParamsRawDir,
} from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import {
  cdsOrderPreferenceAtom,
  allCdsOrderPreferenceAtom,
  datasetNamesForAnalysisAtom,
  datasetSingleCurrentAtom,
  viewedDatasetNameAtom,
} from 'src/state/dataset.state'
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
  allGenomeSizesAtom,
  allGenesAtom,
  allCdsesAtom,
  allTreesAtom,
  allTreesNwkAtom,
  allCladeNodeAttrDescsAtom,
  allPhenotypeAttrDescsAtom,
  allRefNodesAtom,
  allAaMotifsDescsAtom,
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
  allCurrentRefNodeNameAtom,
  initialDataAtom,
  allInitialDataAtom,
} from 'src/state/results.state'
import { numThreadsAtom } from 'src/state/settings.state'
import { launchAnalysis, LaunchAnalysisCallbacks, DatasetFilesOverrides } from 'src/workers/launchAnalysis'
import { axiosFetchRaw, axiosFetchRawMaybe } from 'src/io/axiosFetch'

export function useRunAnalysis() {
  const router = useRouter()

  return useRecoilCallback(
    ({ set, reset, snapshot }) =>
      ({ isSingle }: { isSingle: boolean }) => {
        set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.loadingData)

        reset(analysisResultsAtom)
        reset(clearAllFiltersAtom)

        reset(allAaMotifsDescsAtom)
        reset(allCdsOrderPreferenceAtom)
        reset(allCdsesAtom)
        reset(allCladeNodeAttrDescsAtom)
        reset(allCurrentRefNodeNameAtom)
        reset(allGenesAtom)
        reset(allGenomeSizesAtom)
        reset(allInitialDataAtom)
        reset(allPhenotypeAttrDescsAtom)
        reset(allRefNodesAtom)
        reset(allTreesAtom)
        reset(allTreesNwkAtom)
        reset(allViewedCdsAtom)

        const callbacks: LaunchAnalysisCallbacks = {
          onGlobalStatus(status) {
            set(analysisStatusGlobalAtom, status)
          },
          onInitialData(datasetName, initialData) {
            set(initialDataAtom(datasetName), initialData)

            const {
              geneMap,
              genomeSize,
              defaultCds,
              cdsOrderPreference,
              cladeNodeAttrKeyDescs,
              phenotypeAttrDescs,
              refNodes,
              aaMotifsDescs,
              csvColumnConfigDefault,
            } = initialData

            const genes = Object.values(geneMap.genes)
            set(genesAtom({ datasetName }), genes)

            const cdses = Object.values(geneMap.genes).flatMap((gene) => gene.cdses)
            set(cdsesAtom({ datasetName }), cdses)
            set(genomeSizeAtom({ datasetName }), genomeSize)

            if (defaultCds) {
              set(viewedCdsAtom({ datasetName }), defaultCds)
            }

            if (cdsOrderPreference) {
              set(cdsOrderPreferenceAtom({ datasetName }), cdsOrderPreference)
            }

            set(cladeNodeAttrDescsAtom({ datasetName }), cladeNodeAttrKeyDescs)
            set(phenotypeAttrDescsAtom({ datasetName }), phenotypeAttrDescs)
            set(refNodesAtom({ datasetName }), refNodes)

            const searchNames = (refNodes.search ?? []).map((s) => s.name)
            const defaultSearchName =
              !isNil(refNodes.default) &&
              [...searchNames, REF_NODE_ROOT, REF_NODE_PARENT, REF_NODE_CLADE_FOUNDER].includes(refNodes.default)
                ? refNodes.default
                : REF_NODE_ROOT
            set(currentRefNodeNameAtom({ datasetName }), defaultSearchName)

            set(aaMotifsDescsAtom({ datasetName }), aaMotifsDescs)
            set(csvColumnConfigAtom, csvColumnConfigDefault)
          },
          onAnalysisResult(result) {
            set(analysisResultAtom(result.index), result)
          },
          onError(error) {
            set(globalErrorAtom, error)
          },
          onTree(trees) {
            Object.entries(trees).forEach(([datasetName, trees]) => {
              set(treeAtom(datasetName), (trees?.auspice as unknown as AuspiceJsonV2) ?? undefined)
              set(treeNwkAtom({ datasetName }), trees?.nwk ?? undefined)
            })
          },
          onComplete() {},
        }

        const releaseSnapshot = snapshot.retain()
        const { getPromise } = snapshot

        router
          .push('/results', '/results')
          .then(async () => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.initWorkers)
            const numThreadsResolved = await getPromise(numThreadsAtom)
            const qry = await getPromise(qrySeqInputsStorageAtom)
            const csvColumnConfig = await getPromise(csvColumnConfigAtom)
            const datasetSingleCurrent = await getPromise(datasetSingleCurrentAtom)
            const tree = await getPromise(datasetJsonAtom)

            const overrides: DatasetFilesOverrides = {
              reference: getPromise(refSeqInputAtom),
              genomeAnnotation: getPromise(geneMapInputAtom),
              treeJson: getPromise(refTreeInputAtom),
              pathogenJson: getPromise(virusPropertiesInputAtom),
            }

            const topSuggestedDatasets = await getPromise(topSuggestedDatasetsAtom)
            const seqIndexToTopDatasetName = await getPromise(seqIndexToTopDatasetNameAtom)
            const seqIndicesWithoutDatasetSuggestions = await getPromise(seqIndicesWithoutDatasetSuggestionsAtom)

            const datasets = findDatasets(isSingle, datasetSingleCurrent, topSuggestedDatasets)
            const datasetNames = datasets.map((dataset) => dataset.path)
            set(datasetNamesForAnalysisAtom, datasetNames)
            if (!isNil(datasetNames[0])) {
              set(viewedDatasetNameAtom, datasetNames[0])
            }
            const params: NextcladeParamsRaw = await resolveParams(tree, overrides, datasets)
            return launchAnalysis(
              datasetNames,
              !isSingle ? seqIndexToTopDatasetName : undefined,
              !isSingle ? seqIndicesWithoutDatasetSuggestions : undefined,
              qry,
              params,
              callbacks,
              numThreadsResolved,
              csvColumnConfig,
            )
          })
          .finally(() => {
            releaseSnapshot()
          })
          .catch((error) => {
            set(analysisStatusGlobalAtom, AlgorithmGlobalStatus.failed)
            set(globalErrorAtom, sanitizeError(error))
          })
      },
    [router],
  )
}

function findDatasets(
  isSingleDatasetMode: boolean,
  datasetSingleCurrent: Dataset | undefined,
  topSuggestedDatasets: Dataset[] | undefined,
) {
  if (isSingleDatasetMode) {
    if (isNil(datasetSingleCurrent)) {
      throw new ErrorInternal(`Attempted to start analysis without a dataset selected (single dataset mode)`)
    }
    return [datasetSingleCurrent]
  }
  if (isNil(topSuggestedDatasets) || isEmpty(topSuggestedDatasets)) {
    throw new ErrorInternal(`Attempted to start analysis without datasets selected (multi-dataset mode)`)
  }
  return topSuggestedDatasets
}

async function resolveParams(
  tree: AuspiceTree | undefined,
  overrides: DatasetFilesOverrides,
  datasets: Dataset[] | undefined,
): Promise<NextcladeParamsRaw> {
  if (tree) {
    return resolveInputsForAuspiceDataset(tree, overrides)
  }
  return resolveInputsForNextcladeDataset(overrides, datasets)
}

async function resolveInputsForAuspiceDataset(
  tree: AuspiceTree | undefined,
  overrides: DatasetFilesOverrides,
): Promise<NextcladeParamsRaw> {
  const resolvedOverrides = await pProps({
    genomeAnnotation: resolveOverride(overrides.genomeAnnotation),
    reference: resolveOverride(overrides.reference),
    treeJson: resolveOverride(overrides.treeJson),
    pathogenJson: resolveOverride(overrides.pathogenJson),
  })
  const filteredOverrides = omitBy(resolvedOverrides, isNil)
  return {
    Auspice: {
      auspiceJson: JSON.stringify(tree),
      ...filteredOverrides,
      datasetName: 'Auspice JSON',
    },
  }
}

async function resolveInputsForNextcladeDataset(overrides: DatasetFilesOverrides, datasets: Dataset[] | undefined) {
  if (isNil(datasets) || isEmpty(datasets)) {
    throw new ErrorInternal('Dataset is required but not found')
  }
  const datasetsFiles = await getDatasetsFiles(overrides, datasets)
  return { Dir: datasetsFiles }
}

async function getDatasetsFiles(
  overrides: DatasetFilesOverrides,
  datasets: Dataset[],
): Promise<NextcladeParamsRawDir[]> {
  // TODO: We can override files only if there's 1 dataset. Consider implementing multi-dataset overrides
  if (datasets?.length === 1) {
    return [await getDatasetFilesWithOverrides(overrides, datasets[0])]
  }
  return getDatasetFiles(datasets)
}

/** Resolves all dataset files into strings */
async function getDatasetFiles(datasets: Dataset[]): Promise<NextcladeParamsRawDir[]> {
  return concurrent.map(async (dataset) => {
    return {
      datasetName: dataset.path,
      genomeAnnotation: await axiosFetchRawMaybe(dataset.files?.genomeAnnotation),
      reference: await axiosFetchRaw(dataset.files?.reference),
      treeJson: await axiosFetchRawMaybe(dataset.files?.treeJson),
      pathogenJson: await axiosFetchRaw(dataset.files?.pathogenJson),
    }
  }, datasets)
}

/** Resolves all dataset files overrides into strings, substitutes missing files from dataset files */
async function getDatasetFilesWithOverrides(
  overrides: DatasetFilesOverrides,
  dataset: Dataset,
): Promise<NextcladeParamsRawDir> {
  return {
    datasetName: dataset.path,
    genomeAnnotation: await resolveOverrideOrDatasetFile(overrides.genomeAnnotation, dataset.files?.genomeAnnotation),
    reference: await resolveOverrideOrDatasetFileRequired(overrides.reference, dataset.files?.reference),
    treeJson: await resolveOverrideOrDatasetFile(overrides.treeJson, dataset.files?.treeJson),
    pathogenJson: await resolveOverrideOrDatasetFileRequired(overrides.pathogenJson, dataset.files?.pathogenJson),
  }
}

async function resolveOverrideOrDatasetFileRequired(
  override: Promise<AlgorithmInput | undefined>,
  datasetFileUrl: string | undefined,
): Promise<string> {
  const data = await resolveOverrideOrDatasetFile(override, datasetFileUrl)
  if (!data) {
    throw new Error('Unable to resolve dataset file')
  }
  return data
}

async function resolveOverrideOrDatasetFile(
  override: Promise<AlgorithmInput | undefined>,
  datasetFileUrl: string | undefined,
): Promise<string | undefined> {
  // If override is provided load it
  const overrideResolved = await resolveOverride(override)
  if (overrideResolved) {
    return overrideResolved
  }

  // Otherwise fetch corresponding file from the dataset
  if (datasetFileUrl) {
    return axiosFetchRaw(datasetFileUrl)
  }

  return undefined
}

async function resolveOverride(override: Promise<AlgorithmInput | undefined>) {
  const awaitedInput = await override
  return awaitedInput?.getContent()
}
