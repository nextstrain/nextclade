import { AxiosError, AxiosHeaders } from 'axios'
import { get, groupBy, isNil, mapValues, sortBy } from 'lodash'
import semver from 'semver'
import { findLatestDataset } from 'src/helpers/sortDatasetVersions'
import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { axiosFetch, axiosHeadOrUndefined, HttpRequestError } from 'src/io/axiosFetch'

import { Dataset, DatasetFiles, DatasetsIndexJson, DatasetsIndexV2Json, MinimizerIndexVersion } from 'src/types'
import urljoin from 'url-join'

const DATASET_INDEX_SCHEMA_VERSION_MIN = '3.0.0'
const MINIMIZER_INDEX_ALGO_VERSION = 'v1'
const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? ''

export function isCompatible(dataset: Dataset): boolean {
  const minVersion = dataset.version?.compatibility?.web ?? PACKAGE_VERSION
  return semver.gte(PACKAGE_VERSION, minVersion)
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

export interface GetDatasetsOptions {
  latestOnly?: boolean
}

export function getCompatibleEnabledDatasets(
  datasetServerUrl: string,
  datasetsIndexJson: DatasetsIndexV2Json,
  options: GetDatasetsOptions = {},
): Dataset[] {
  const { latestOnly = false } = options

  // Get all compatible datasets and expand each dataset to include all its versions
  const allDatasets = datasetsIndexJson.collections
    .flatMap((collection) =>
      collection.datasets.filter(isCompatible).map((dataset) => ({ ...dataset, collectionId: collection.meta.id })),
    )
    .flatMap((dataset) => {
      // If dataset has versions array, create a separate Dataset object for each version
      if (dataset.versions && dataset.versions.length > 0) {
        return dataset.versions.map((version) => ({
          ...dataset,
          version, // Use this specific version instead of the default version
        }))
      }
      // If no versions array, use the dataset as-is
      return [dataset]
    })
    .map((dataset) => fileUrlsToAbsolute(datasetServerUrl, dataset))

  if (!latestOnly) {
    return allDatasets
  }

  // Group datasets by path and find the latest version for each path
  const datasetsByPath = groupBy(allDatasets, (dataset) => dataset.path)

  // For each path, find the dataset with the latest version
  return Object.values(datasetsByPath)
    .map((datasets) => findLatestDataset(datasets))
    .filter((dataset): dataset is Dataset => dataset !== undefined)
}

/** Find the latest dataset, optionally by name, ref and tag */
export function findDataset(datasets: Dataset[], name?: string, tag?: string) {
  const datasetsFound = filterDatasets(datasets, name, tag)
  return findLatestDataset(datasetsFound)
}

/** Find the datasets given name, ref and tag */
export function filterDatasets(datasets: Dataset[], name?: string, tag?: string) {
  return datasets.filter((dataset) => {
    let isMatch = !isNil(name) && (dataset.path === name || !!dataset.shortcuts?.includes(name))

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
          { url, headers: new AxiosHeaders() },
        ),
      )
    } else {
      throw new HttpRequestError(
        new AxiosError(
          `When attempted to fetch dataset index: The current dataset server '${datasetServerUrl}' does not contain 'index.json' file required for Nextclade v3 to operate or the server is not reachable. Please make sure that 'dataset-server' URL parameter contains valid dataset server URL or remove the parameter.`,
          get(error, 'status'),
          { url, headers: new AxiosHeaders() },
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
