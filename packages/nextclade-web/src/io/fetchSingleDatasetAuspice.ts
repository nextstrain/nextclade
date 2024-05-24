import { isEmpty } from 'lodash'
import { FatalError } from 'next/dist/lib/fatal-error'
import { attrStrMaybe, AuspiceTree, Dataset } from 'src/types'
import { removeTrailingSlash } from 'src/io/url'
import { axiosFetch } from 'src/io/axiosFetch'

export async function fetchSingleDatasetAuspice(datasetJsonUrl_: string) {
  const datasetJsonUrl = removeTrailingSlash(datasetJsonUrl_)

  const auspiceJson = await axiosFetch<AuspiceTree>(datasetJsonUrl, {
    headers: { Accept: 'application/json, text/plain, */*' },
  })
  const pathogen = auspiceJson.meta?.extensions?.nextclade?.pathogen

  if (isEmpty(auspiceJson.root_sequence?.nuc)) {
    throw new FatalError(`Auspice JSON does not contain required field '.root_sequence.nuc': ${datasetJsonUrl_}`)
  }

  const currentDataset: Dataset & { auspiceJson?: AuspiceTree } = {
    path: datasetJsonUrl,
    capabilities: {
      primers: false,
      qc: [],
    },
    ...pathogen,
    auspiceJson,
  }

  const datasets = [currentDataset]
  const defaultDataset = currentDataset
  const currentDatasetName = currentDataset.path
  const defaultDatasetName = currentDatasetName
  const defaultDatasetNameFriendly = attrStrMaybe(currentDataset.attributes, 'name') ?? currentDatasetName

  return { datasets, defaultDataset, defaultDatasetName, defaultDatasetNameFriendly, currentDataset }
}
