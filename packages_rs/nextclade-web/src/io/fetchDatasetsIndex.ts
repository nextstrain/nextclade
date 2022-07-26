import { mapValues } from 'lodash'
import semver from 'semver'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import urljoin from 'url-join'

import { Dataset, DatasetsIndexV2Json } from 'src/algorithms/types'
import { axiosFetch } from 'src/io/axiosFetch'

let DATA_FULL_DOMAIN = process.env.DATA_FULL_DOMAIN ?? '/'
// Add HTTP Origin if DATA_FULL_DOMAIN is a relative path (start with '/')
if (typeof window !== 'undefined' && DATA_FULL_DOMAIN.slice(0) === '/') {
  DATA_FULL_DOMAIN = urljoin(window.location.origin, DATA_FULL_DOMAIN)
}
const DATA_INDEX_FILE = 'index_v2.json'
export const DATA_INDEX_FILE_FULL_URL = urljoin(DATA_FULL_DOMAIN, DATA_INDEX_FILE)
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

export function fileUrlsToAbsolute(dataset: Dataset): Dataset {
  const files = mapValues(dataset.files, (file) => urljoin(DATA_FULL_DOMAIN, file))
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

export function getLatestCompatibleEnabledDatasets(datasetsIndexJson: DatasetsIndexV2Json) {
  const datasets = datasetsIndexJson.datasets
    .filter(isEnabled)
    .filter(isCompatible)
    .filter(isLatest)
    .map((dataset) => fileUrlsToAbsolute(dataset))

  const defaultDataset = getDefaultDataset(datasets)

  const { value, valueFriendly } = defaultDataset.attributes.name

  return {
    datasets,
    defaultDatasetName: value,
    defaultDatasetNameFriendly: valueFriendly ?? value,
  }
}

export function findDataset(datasets: Dataset[], name?: string, refAccession?: string, tag?: string) {
  return datasets.find((dataset) => {
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

export async function fetchDatasetsIndex() {
  return axiosFetch<DatasetsIndexV2Json>(DATA_INDEX_FILE_FULL_URL)
}
