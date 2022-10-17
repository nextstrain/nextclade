import { isEmpty, isNil } from 'lodash'
import urljoin from 'url-join'
import type { ParsedUrlQuery } from 'querystring'
import { Dataset, DatasetTag } from 'src/types'
import { concurrent } from 'fasy'

import { sanitizeError } from 'src/helpers/sanitizeError'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { axiosFetchOrUndefined, axiosHead } from './axiosFetch'

export async function getDatasetFromUrlParams(urlQuery: ParsedUrlQuery, datasets: Dataset[]) {
  // Retrieve dataset-related URL params and try to find a dataset based on these params
  const datasetName = getQueryParamMaybe(urlQuery, 'dataset-name')

  if (!datasetName) {
    return undefined
  }

  const datasetRef = getQueryParamMaybe(urlQuery, 'dataset-reference')
  const datasetTag = getQueryParamMaybe(urlQuery, 'dataset-tag')

  const dataset = findDataset(datasets, datasetName, datasetRef, datasetTag)
  if (!dataset) {
    throw new Error(
      `Incorrect URL parameters: unable to find dataset with name='${datasetName}', ref='${datasetRef ?? ''}', tag='${
        datasetTag ?? ''
      }' `,
    )
  }

  return dataset
}

export async function initializeDatasets(urlQuery: ParsedUrlQuery, datasetServerUrlDefault: string) {
  const datasetServerUrl = getQueryParamMaybe(urlQuery, 'dataset-server') ?? datasetServerUrlDefault

  const datasetsIndexJson = await fetchDatasetsIndex(datasetServerUrl)

  const { datasets, defaultDatasetName, defaultDatasetNameFriendly } = getLatestCompatibleEnabledDatasets(
    datasetServerUrl,
    datasetsIndexJson,
  )

  // Check if URL params specify dataset params and try to find the corresponding dataset
  const currentDataset = await getDatasetFromUrlParams(urlQuery, datasets)

  const currentDatasetName = currentDataset?.attributes.name.value

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }
}

const GITHUB_URL_REGEX =
  /^https?:\/\/github.com\/(?<org>.*?)\/(?<repo>.*?)\/(?<pathType>tree|branch?)\/(?<branch>.*?)\/(?<path>.*?)\/?$/

export async function initializeGithubDataset(urlQuery: ParsedUrlQuery) {
  const datasetGithubUrl = getQueryParamMaybe(urlQuery, 'dataset-github')

  if (!datasetGithubUrl) {
    return undefined
  }

  const match = GITHUB_URL_REGEX.exec(datasetGithubUrl)

  if (!match?.groups) {
    throw new ErrorDatasetGithubUrlInvalid(datasetGithubUrl)
  }

  if (Object.values(match?.groups).every((s) => isNil(s) || isEmpty(s))) {
    throw new ErrorDatasetGithubUrlInvalid(datasetGithubUrl)
  }

  const { org, repo, branch, path } = match.groups

  const datasetBase = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${path}`

  const tag = await axiosFetchOrUndefined<DatasetTag>(urljoin(datasetBase, 'tag.json'))

  const currentDataset: Dataset = {
    enabled: true,
    attributes: {
      name: {
        value: tag?.attributes?.name.value ?? `${org}/${repo}/${branch}/${path}`,
        valueFriendly: tag?.attributes?.name.valueFriendly ?? `${org}/${repo}/${branch}/${path}`,
        isDefault: true,
      },
      reference: {
        value: tag?.attributes?.reference.value ?? 'unknown',
        valueFriendly: tag?.attributes?.reference.valueFriendly ?? 'unknown',
        isDefault: true,
      },
      tag: {
        value: tag?.attributes?.tag.value ?? 'unknown',
        valueFriendly: tag?.attributes?.tag.valueFriendly ?? 'unknown',
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
      'genemap.gff': urljoin(datasetBase, 'genemap.gff'),
      'primers.csv': urljoin(datasetBase, 'primers.csv'),
      'qc.json': urljoin(datasetBase, 'qc.json'),
      'reference.fasta': urljoin(datasetBase, 'reference.fasta'),
      'sequences.fasta': urljoin(datasetBase, 'sequences.fasta'),
      'tag.json': urljoin(datasetBase, 'tag.json'),
      'tree.json': urljoin(datasetBase, 'tree.json'),
      'virus_properties.json': urljoin(datasetBase, 'virus_properties.json'),
    },
    params: { defaultGene: undefined, geneOrderPreference: undefined },
    zipBundle: urljoin(datasetBase, 'dataset.zip'),
  }

  const datasets = [currentDataset]
  const currentDatasetName = currentDataset.attributes.name.value
  const defaultDatasetName = currentDatasetName
  const defaultDatasetNameFriendly = currentDataset.attributes.name.valueFriendly ?? currentDatasetName

  await concurrent.forEach(
    async ([filename, url]) => {
      try {
        await axiosHead(url)
      } catch (error_: unknown) {
        const error = sanitizeError(error_)
        throw new ErrorDatasetGithubFileMissing(filename, error)
      }
    },
    Object.entries(currentDataset.files).filter(([filename, _]) => filename !== 'tag.json'),
  )

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }
}

const GITHUB_URL_EXAMPLE =
  'https://github.com/nextstrain/nextclade_data/tree/master/data/datasets/flu_yam_ha/references/JN993010/versions/2022-07-27T12%3A00%3A00Z/files'

export class ErrorDatasetGithubUrlInvalid extends Error {
  public readonly datasetGithubUrl: string

  constructor(datasetGithubUrl: string) {
    super(
      `Dataset GitHub URL (provided using 'dataset-github' URL parameter) is invalid: '${datasetGithubUrl}'. Check the correctness of the URL. If you don't intend to use custom dataset, remove the parameter from the address or restart the application. An example of a correct URL: '${GITHUB_URL_EXAMPLE}'`,
    )
    this.datasetGithubUrl = datasetGithubUrl
  }
}

export class ErrorDatasetGithubFileMissing extends Error {
  public readonly filename: string

  constructor(filename: string, error: Error) {
    super(`Custom dataset is invalid: the file ${filename} cannot be retrieved: ${error.message}`)
    this.cause = error
    this.filename = filename
  }
}
