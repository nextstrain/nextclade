import urljoin from 'url-join'
import { concurrent } from 'fasy'

import { Dataset, DatasetTag } from 'src/types'
import { removeTrailingSlash } from 'src/io/url'
import { axiosFetchOrUndefined, axiosHead } from 'src/io/axiosFetch'
import { sanitizeError } from 'src/helpers/sanitizeError'

export async function fetchSingleDatasetFromUrl(
  datasetRootUrl_: string,
  meta?: { datasetOriginalUrl?: string; datasetGithubRepo?: string },
) {
  const datasetRootUrl = removeTrailingSlash(datasetRootUrl_)

  const tag = await axiosFetchOrUndefined<DatasetTag>(urljoin(datasetRootUrl, 'tag.json'))

  const currentDataset: Dataset = {
    id: '0',
    enabled: true,
    attributes: {
      name: {
        value: tag?.attributes?.name?.value ?? meta?.datasetGithubRepo ?? 'untitled-dataset',
        valueFriendly: tag?.attributes?.name?.valueFriendly ?? meta?.datasetGithubRepo ?? 'Untitled dataset',
        isDefault: true,
      },
      reference: {
        value: tag?.attributes?.reference?.value ?? 'unknown',
        valueFriendly: tag?.attributes?.reference?.valueFriendly ?? 'unknown',
        isDefault: true,
      },
      tag: {
        value: tag?.attributes?.tag?.value ?? 'unknown',
        valueFriendly: tag?.attributes?.tag?.valueFriendly ?? 'unknown',
        isDefault: true,
      },
      url: {
        value: tag?.attributes?.url?.value ?? meta?.datasetGithubRepo ?? meta?.datasetOriginalUrl ?? datasetRootUrl,
        valueFriendly: tag?.attributes?.url?.valueFriendly ?? meta?.datasetGithubRepo,
        isDefault: true,
      },
    },
    comment: tag?.comment ?? '',
    compatibility: tag?.compatibility ?? {
      nextcladeCli: {
        min: '1.10.0',
      },
      nextcladeWeb: {
        min: '1.13.0',
      },
    },
    files: {
      'genemap.gff': urljoin(datasetRootUrl, 'genemap.gff'),
      'primers.csv': urljoin(datasetRootUrl, 'primers.csv'),
      'qc.json': urljoin(datasetRootUrl, 'qc.json'),
      'reference.fasta': urljoin(datasetRootUrl, 'reference.fasta'),
      'sequences.fasta': urljoin(datasetRootUrl, 'sequences.fasta'),
      'tag.json': urljoin(datasetRootUrl, 'tag.json'),
      'tree.json': urljoin(datasetRootUrl, 'tree.json'),
      'virus_properties.json': urljoin(datasetRootUrl, 'virus_properties.json'),
    },
    params: tag?.params ?? { defaultGene: undefined, geneOrderPreference: undefined },
    zipBundle: tag?.zipBundle ?? urljoin(datasetRootUrl, 'dataset.zip'),
  }

  const datasets = [currentDataset]
  const defaultDataset = currentDataset
  const currentDatasetName = currentDataset.attributes.name.value
  const defaultDatasetName = currentDatasetName
  const defaultDatasetNameFriendly = currentDataset.attributes.name.valueFriendly ?? currentDatasetName

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
