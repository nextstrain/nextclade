import { AxiosError } from 'axios'
import { get, head, mapValues, sortBy, sortedUniq } from 'lodash'
import semver from 'semver'
import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import urljoin from 'url-join'

import { Dataset, DatasetFiles, DatasetsIndexJson, DatasetsIndexV2Json, MinimizerIndexVersion } from 'src/types'
import { axiosFetch, axiosHeadOrUndefined, HttpRequestError } from 'src/io/axiosFetch'

const DATASET_INDEX_SCHEMA_VERSION_MIN = '3.0.0'
const MINIMIZER_INDEX_ALGO_VERSION = 'v1'
const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? ''

export function isCompatible(dataset: Dataset): boolean {
  const minVersion = dataset.version?.compatibility?.web ?? PACKAGE_VERSION
  return semver.gte(PACKAGE_VERSION, minVersion)
}

export function isLatest(dataset: Dataset): boolean {
  // Dataset is latest if dataset's version is the last entry in the array of all versions
  return head(sortedUniq(dataset.versions ?? []).map((v) => v.updatedAt)) === dataset.version?.updatedAt
}

export function fileUrlsToAbsolute(datasetServerUrl: string, dataset: Dataset): Dataset {
  const restFilesAbs = mapValues(dataset.files, (file) =>
    file ? urljoin(datasetServerUrl, dataset.path, dataset.version?.tag ?? '', file) : undefined,
  ) as DatasetFiles
  const files = {
    ...restFilesAbs,
  }
  return { ...dataset, files }
}

export function getLatestCompatibleEnabledDatasets(datasetServerUrl: string, datasetsIndexJson: DatasetsIndexV2Json) {
  const datasets = datasetsIndexJson.collections
    .flatMap((collection) => collection.datasets.filter(isCompatible).filter(isLatest))
    .map((dataset) => fileUrlsToAbsolute(datasetServerUrl, dataset))
  return { datasets }
}

/** Find the latest dataset, optionally by name, ref and tag */
export function findDataset(datasets: Dataset[], name?: string, tag?: string) {
  const datasetsFound = filterDatasets(datasets, name, tag)
  return head(sortBy(datasetsFound, (dataset) => dataset.version?.tag ?? ''))
}

/** Find the datasets given name, ref and tag */
export function filterDatasets(datasets: Dataset[], name?: string, tag?: string) {
  return datasets.filter((dataset) => {
    let isMatch = dataset.path === name

    if (tag) {
      isMatch = isMatch && dataset.version?.tag === tag
    }

    return isMatch
  })
}

export async function fetchDatasetsIndex(datasetServerUrl: string) {
  const url = urljoin(datasetServerUrl, 'index.json')

  let index
  try {
    index = await axiosFetch<DatasetsIndexJson>(url)
  } catch (error: unknown) {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (await axiosHeadOrUndefined(urljoin(datasetServerUrl, 'index_v2.json'))) {
      throw new HttpRequestError(
        new AxiosError(
          `When attempted to fetch dataset index: The current dataset server at '${datasetServerUrl}' contains 'index_v2.json' file used in Nextclade v2, but does not contain 'index.json' file required for Nextclade v3.`,
          get(error, 'status'),
          { url },
        ),
      )
    } else {
      throw new HttpRequestError(
        new AxiosError(
          `When attempted to fetch dataset index: The current dataset server '${datasetServerUrl}' does not contain 'index.json' file required for Nextclade v3 to operate or the server is not reachable. Please make sure that 'dataset-server' URL parameter contains valid dataset server URL or remove the parameter.`,
          get(error, 'status'),
          { url },
        ),
      )
    }
  }

  const schema = get(index, 'schemaVersion')
  if (!schema) {
    throw new Error(
      `When attempted to fetch dataset index: The current dataset server '${datasetServerUrl}' contains 'index.json' file but its format is not recognized. This might be due to incompatibility between versions of Nextclade and of the dataset server.`,
    )
  } else if (!semver.gte(schema, DATASET_INDEX_SCHEMA_VERSION_MIN)) {
    throw new Error(
      `When attempted to fetch dataset index: The current dataset server '${datasetServerUrl}' contains 'index.json' file formatted for version '${schema}', but this version of Nextclade only supports versions '${DATASET_INDEX_SCHEMA_VERSION_MIN}' and above.`,
    )
  }

  return index
}

export async function getCompatibleMinimizerIndexVersion(
  datasetServerUrl: string,
  datasetsIndexJson: DatasetsIndexV2Json,
): Promise<MinimizerIndexVersion | undefined> {
  let candidates = datasetsIndexJson.minimizerIndex?.filter(
    (minimizerIndexVer) => MINIMIZER_INDEX_ALGO_VERSION >= minimizerIndexVer.version,
  )
  candidates = sortBy(candidates, (candidate) => candidate.version).reverse()
  const index = takeFirstMaybe(candidates)
  if (index) {
    return {
      ...index,
      path: urljoin(datasetServerUrl, index.path),
    }
  }
  return undefined
}
