import { head, mapValues, sortBy, sortedUniq } from 'lodash'
// import semver from 'semver'
import urljoin from 'url-join'

import { Dataset, DatasetsIndexJson, DatasetsIndexV2Json } from 'src/types'
import { axiosFetch } from 'src/io/axiosFetch'

// const thisVersion = process.env.PACKAGE_VERSION ?? ''

export function isEnabled(dataset: Dataset) {
  return dataset.enabled
}

export function isCompatible(_dataset: Dataset): boolean {
  // const { min, max } = dataset.compatibility.nextcladeWeb
  // return semver.gte(thisVersion, min ?? thisVersion) && semver.lte(thisVersion, max ?? thisVersion)

  // FIXME
  return true
}

export function isLatest(dataset: Dataset): boolean {
  // Dataset is latest if dataset's version is the last entry in the array of all versions
  return head(sortedUniq(dataset.versions ?? []).map((v) => v.updatedAt)) === dataset.version?.updatedAt
}

export function fileUrlsToAbsolute(datasetServerUrl: string, dataset: Dataset): Dataset {
  const { reference, ...restFiles } = dataset.files
  const referenceAbs = urljoin(datasetServerUrl, reference)
  const restFilesAbs = mapValues(restFiles, (file) =>
    file ? urljoin(datasetServerUrl, dataset.path, dataset.version?.tag ?? '', file) : undefined,
  )
  const files = {
    reference: referenceAbs,
    ...restFilesAbs,
  }
  return { ...dataset, files }
}

export function getLatestCompatibleEnabledDatasets(datasetServerUrl: string, datasetsIndexJson: DatasetsIndexV2Json) {
  const datasets = datasetsIndexJson.datasets
    .filter(isEnabled)
    .filter(isCompatible)
    .filter(isLatest)
    .map((dataset) => fileUrlsToAbsolute(datasetServerUrl, dataset))
  return { datasets }
}

/** Find the latest dataset, optionally by name, ref and tag */
export function findDataset(datasets: Dataset[], name?: string, refAccession?: string, tag?: string) {
  const datasetsFound = filterDatasets(datasets, name, refAccession, tag)
  return head(sortBy(datasetsFound, (dataset) => dataset.version?.tag ?? ''))
}

/** Find the datasets given name, ref and tag */
export function filterDatasets(datasets: Dataset[], name?: string, refAccession?: string, tag?: string) {
  return datasets.filter((dataset) => {
    let isMatch = dataset.attributes.name.value === name

    if (refAccession) {
      isMatch = isMatch && dataset.attributes.reference.value === refAccession
    }

    if (tag) {
      isMatch = isMatch && dataset.version?.tag === tag
    }

    return isMatch
  })
}

export async function fetchDatasetsIndex(datasetServerUrl: string) {
  return axiosFetch<DatasetsIndexJson>(urljoin(datasetServerUrl, 'index.json'))
}
