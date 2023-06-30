import { first, mapValues, sortBy } from 'lodash'
import semver from 'semver'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import urljoin from 'url-join'

import { Dataset, DatasetsIndexV2Json } from 'src/types'
import { axiosFetch } from 'src/io/axiosFetch'

const DATA_INDEX_FILE = 'index_v2.json'
const thisVersion = process.env.PACKAGE_VERSION ?? ''

export function isEnabled(dataset: Dataset) {
  return dataset.enabled
}

export function isCompatible(dataset: Dataset) {
  const { min, max } = dataset.compatibility.nextcladeWeb
  return semver.gte(thisVersion, min ?? thisVersion) && semver.lte(thisVersion, max ?? thisVersion)
}

export function isLatest(dataset: Dataset) {
  return dataset.attributes.tag.isDefault
}

export function areAllAttributesDefault(dataset: Dataset) {
  return Object.values(dataset.attributes).every((attr) => attr.isDefault)
}

export function fileUrlsToAbsolute(datasetServerUrl: string, dataset: Dataset): Dataset {
  const files = mapValues(dataset.files, (file) => urljoin(datasetServerUrl, file))
  return { ...dataset, files }
}

export function getDefaultDataset(datasets: Dataset[]) {
  const defaultDatasetCandidates = datasets.filter(areAllAttributesDefault)
  if (defaultDatasetCandidates.length === 0) {
    throw new ErrorInternal('Unable to find default dataset')
  } else if (defaultDatasetCandidates.length > 1) {
    throw new ErrorInternal('Multiple candidates found for default dataset')
  }
  return datasets[0]
}

export function getLatestCompatibleEnabledDatasets(datasetServerUrl: string, datasetsIndexJson: DatasetsIndexV2Json) {
  const datasets = datasetsIndexJson.datasets
    .filter(isEnabled)
    .filter(isCompatible)
    .filter(isLatest)
    .map((dataset) => fileUrlsToAbsolute(datasetServerUrl, dataset))

  const defaultDataset = getDefaultDataset(datasets)

  const { value, valueFriendly } = defaultDataset.attributes.name

  return {
    datasets,
    defaultDataset,
    defaultDatasetName: value,
    defaultDatasetNameFriendly: valueFriendly ?? value,
  }
}

/** Find the latest dataset, optionally by name, ref and tag */
export function findDataset(datasets: Dataset[], name?: string, refAccession?: string, tag?: string) {
  const datasetsFound = filterDatasets(datasets, name, refAccession, tag)
  return first(sortBy(datasetsFound, (dataset) => dataset.attributes.tag))
}

/** Find the datasets given name, ref and tag */
export function filterDatasets(datasets: Dataset[], name?: string, refAccession?: string, tag?: string) {
  return datasets.filter((dataset) => {
    let isMatch = dataset.attributes.name.value === name

    if (refAccession) {
      isMatch = isMatch && dataset.attributes.reference.value === refAccession
    }

    if (tag) {
      isMatch = isMatch && dataset.attributes.tag.value === tag
    }

    return isMatch
  })
}

export async function fetchDatasetsIndex(datasetServerUrl: string) {
  return axiosFetch<DatasetsIndexV2Json>(urljoin(datasetServerUrl, DATA_INDEX_FILE))
}
