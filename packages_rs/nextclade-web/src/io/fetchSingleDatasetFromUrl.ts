import urljoin from 'url-join'
import { concurrent } from 'fasy'
import { attrStrMaybe, Dataset, VirusProperties } from 'src/types'
import { removeTrailingSlash } from 'src/io/url'
import { axiosFetch, axiosHead } from 'src/io/axiosFetch'
import { sanitizeError } from 'src/helpers/sanitizeError'

export async function fetchSingleDatasetFromUrl(
  datasetRootUrl_: string,
  meta?: { datasetOriginalUrl?: string; datasetGithubRepo?: string },
) {
  const datasetRootUrl = removeTrailingSlash(datasetRootUrl_)

  const pathogen = await axiosFetch<VirusProperties>(urljoin(datasetRootUrl, 'pathogen.json'))
  const currentDataset: Dataset = {
    path: datasetRootUrl,
    capabilities: {
      primers: false,
      qc: [],
    },
    ...pathogen,
  }

  const datasets = [currentDataset]
  const defaultDataset = currentDataset
  const currentDatasetName = currentDataset.path
  const defaultDatasetName = currentDatasetName
  const defaultDatasetNameFriendly = attrStrMaybe(currentDataset.attributes, 'name') ?? currentDatasetName

  await concurrent.forEach(
    async ([filename, fileUrl]) => {
      try {
        await axiosHead(fileUrl)
      } catch (error_: unknown) {
        const error = sanitizeError(error_)

        throw new ErrorDatasetFileMissing(error, {
          datasetOriginalUrl: meta?.datasetGithubRepo ?? meta?.datasetOriginalUrl,
          datasetRootUrl,
          filename,
          fileUrl,
        })
      }
    },
    Object.entries(currentDataset.files).filter(([filename, _]) => !['tag.json', 'sequences.fasta'].includes(filename)),
  )

  return { datasets, defaultDataset, defaultDatasetName, defaultDatasetNameFriendly, currentDataset }
}

export class ErrorDatasetFileMissing extends Error {
  public readonly datasetOriginalUrl?: string
  public readonly datasetRootUrl: string
  public readonly filename: string
  public readonly fileUrl: string

  constructor(
    cause: Error,
    {
      datasetOriginalUrl,
      datasetRootUrl,
      filename,
      fileUrl,
    }: {
      datasetOriginalUrl?: string
      datasetRootUrl: string
      filename: string
      fileUrl: string
    },
  ) {
    super(
      `Custom dataset (provided using 'dataset-url' URL parameter) is invalid:` +
        ` the required dataset file '${filename}' cannot be retrieved: ${cause.message}.` +
        ` Additional details: provided URL was: '${datasetOriginalUrl ?? datasetRootUrl}';` +
        ` deduced raw root URL was: '${datasetRootUrl}';` +
        ` attempted to download the file from '${fileUrl}'.`,
    )
    this.cause = cause
    this.datasetOriginalUrl = datasetOriginalUrl
    this.datasetRootUrl = datasetRootUrl
    this.filename = filename
    this.fileUrl = fileUrl
  }
}
