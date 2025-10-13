import { isEmpty } from 'lodash'
import { attrStrMaybe, AuspiceTree, DatasetRaw } from 'src/types'
import { removeTrailingSlash } from 'src/io/url'
import { axiosFetch, axiosFetchOrUndefined } from 'src/io/axiosFetch'

export async function fetchSingleDatasetAuspice(datasetJsonUrl_: string) {
  const datasetJsonUrl = removeTrailingSlash(datasetJsonUrl_)

  const auspiceJson = await axiosFetch<AuspiceTree>(datasetJsonUrl, {
    headers: {
      Accept: 'application/vnd.nextstrain.dataset.main+json;q=1, application/json;q=0.9, text/plain;q=0.8, */*;q=0.1',
    },
  })

  if (isEmpty(auspiceJson.root_sequence)) {
    const sidecar = await axiosFetchOrUndefined<Record<string, string>>(datasetJsonUrl, {
      headers: { Accept: 'application/vnd.nextstrain.dataset.root-sequence+json' },
      strictAccept: true,
    })
    if (!isEmpty(sidecar)) {
      auspiceJson.root_sequence = sidecar
    }
  }

  const pathogen = auspiceJson.meta.extensions?.nextclade?.pathogen

  const name =
    attrStrMaybe(pathogen?.attributes, 'name') ??
    auspiceJson.meta.title ??
    auspiceJson.meta.description ??
    datasetJsonUrl

  let version = pathogen?.version
  if (!version) {
    const updatedAt = pathogen?.version?.updatedAt ?? auspiceJson.meta.updated
    version = {
      tag: updatedAt ?? '',
      updatedAt,
    }
  }

  const currentDataset: DatasetRaw = {
    path: datasetJsonUrl,
    capabilities: {
      primers: false,
      qc: [],
    },
    ...pathogen,
    attributes: {
      name,
      ...pathogen?.attributes,
    },
    type: 'auspiceJson',
    version,
  }

  const datasets = [currentDataset]
  const defaultDataset = currentDataset
  const currentDatasetName = currentDataset.path
  const defaultDatasetName = currentDatasetName
  const defaultDatasetNameFriendly = attrStrMaybe(currentDataset.attributes, 'name') ?? currentDatasetName

  return { datasets, defaultDataset, defaultDatasetName, defaultDatasetNameFriendly, currentDataset, auspiceJson }
}
