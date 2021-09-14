/* eslint-disable no-loops/no-loops */
import { mapValues, maxBy } from 'lodash'
import semver from 'semver'
import urljoin from 'url-join'

import { Dataset, DatasetFiles, DatasetFlat, DatasetRef, DatasetsIndexJson, DatasetVersion } from 'src/algorithms/types'
import { axiosFetch } from 'src/io/axiosFetch'

const DATA_FULL_DOMAIN = process.env.DATA_FULL_DOMAIN ?? '/'
const DATA_INDEX_FILE = 'index.json'
export const DATA_INDEX_FILE_FULL_URL = urljoin(DATA_FULL_DOMAIN, DATA_INDEX_FILE)
const thisVersion = process.env.PACKAGE_VERSION ?? ''

export function isCompatible({ min, max }: { min?: string; max?: string }) {
  return semver.gte(thisVersion, min ?? thisVersion) && semver.lte(thisVersion, max ?? thisVersion)
}

export function fileUrlsToAbsolute(files: DatasetFiles): DatasetFiles {
  return mapValues(files, (file: string) => urljoin(DATA_FULL_DOMAIN, file))
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function getEnabledDatasets(datasets?: Dataset[]): Dataset[] {
  const enabledDatasets: Dataset[] = []
  for (const dataset of datasets ?? []) {
    if (!dataset.enabled) {
      continue // eslint-disable-line no-continue
    }

    const enabledDataset: Dataset = { ...dataset }
    enabledDataset.datasetRefs = []

    for (const datasetRef of dataset.datasetRefs) {
      if (!datasetRef.enabled) {
        continue // eslint-disable-line no-continue
      }

      const enabledDatasetRef: DatasetRef = { ...datasetRef }
      enabledDatasetRef.versions = []

      for (const version of datasetRef.versions) {
        if (version.enabled) {
          enabledDatasetRef.versions.push(version)
        }
      }

      if (enabledDatasetRef.versions.length > 0) {
        enabledDataset.datasetRefs.push(enabledDatasetRef)
      }
    }

    if (enabledDataset.datasetRefs.length > 0) {
      enabledDatasets.push(enabledDataset)
    }
  }

  return enabledDatasets
}

export function getCompatibleDatasets(datasets?: Dataset[]): Dataset[] {
  const compatibleDatasets: Dataset[] = []

  for (const dataset of datasets ?? []) {
    const compatibleDatasetRefs: DatasetRef[] = []

    for (const datasetRef of dataset.datasetRefs) {
      let compatibleVersions: DatasetVersion[] = []
      for (const version of datasetRef.versions) {
        if (isCompatible(version.compatibility.nextcladeWeb)) {
          compatibleVersions.push(version)
        }
      }

      compatibleVersions = compatibleVersions.map((ver) => ({ ...ver, files: fileUrlsToAbsolute(ver.files) }))

      if (compatibleVersions.length > 0) {
        compatibleDatasetRefs.push({
          ...datasetRef,
          versions: compatibleVersions,
        })
      }
    }

    if (compatibleDatasetRefs.length > 0) {
      compatibleDatasets.push({
        ...dataset,
        datasetRefs: compatibleDatasetRefs,
      })
    }
  }

  return compatibleDatasets
}

export function getLatestDatasetsFlat(datasets?: Dataset[]): DatasetFlat[] {
  const latestDatasetsFlat: DatasetFlat[] = []
  for (const dataset of datasets ?? []) {
    for (const datasetRef of dataset.datasetRefs) {
      const latestVersion = maxBy(datasetRef.versions, (version) => version.tag)
      if (latestVersion) {
        latestDatasetsFlat.push({
          ...dataset,
          ...datasetRef,
          ...latestVersion,
        })
      }
    }
  }

  return latestDatasetsFlat
}

export function getLatestCompatibleEnabledDatasets(datasetsIndexJson?: DatasetsIndexJson) {
  const datasets = getLatestDatasetsFlat(getCompatibleDatasets(getEnabledDatasets(datasetsIndexJson?.datasets)))

  const defaultDatasetName = datasetsIndexJson?.settings.defaultDatasetName ?? ''
  const defaultDataset = datasets.find((dataset) => dataset.name === defaultDatasetName)
  let defaultDatasetNameFriendly = ''
  if (defaultDataset) {
    defaultDatasetNameFriendly = defaultDataset.nameFriendly
  } else if (datasets.length > 0) {
    defaultDatasetNameFriendly = datasets[0].nameFriendly
  }

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly }
}

export class DatasetNotFoundError extends Error {
  constructor(name: string, refAccession?: string, tag?: string) {
    let message = `Dataset not found: name=${name}`
    if (refAccession) {
      message += `, reference=${refAccession}`
    }
    if (tag) {
      message += `, tag=${tag}`
    }
    super(message)
  }
}

export function findDataset(datasets: DatasetFlat[], name?: string, refAccession?: string, tag?: string) {
  return datasets.find((dataset) => {
    const ref = refAccession ?? dataset.defaultRef
    let isMatch = dataset.name === name && dataset.reference.accession === ref
    if (tag) {
      isMatch = isMatch && dataset.tag === tag
    }
    return isMatch
  })
}

export async function fetchDatasetsIndex() {
  return axiosFetch<DatasetsIndexJson>(DATA_INDEX_FILE_FULL_URL)
}
