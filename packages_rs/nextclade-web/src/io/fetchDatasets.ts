/* eslint-disable prefer-template */
import type { ParsedUrlQuery } from 'querystring'
import { isEmpty, isNil } from 'lodash'
import urljoin from 'url-join'
import { concurrent } from 'fasy'

import { Dataset, DatasetTag } from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { axiosFetchOrUndefined, axiosHead } from 'src/io/axiosFetch'
import { removeTrailingSlash } from 'src/io/url'

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
  // eslint-disable-next-line security/detect-unsafe-regex
  /^https?:\/\/github.com\/(?<org>.*?)\/(?<repo>.*?)\/(?<pathType>tree|branch?)\/(?<branch>.*?)(\/?<path>.*?)?\/?$/

export async function initializeGithubDataset(urlQuery: ParsedUrlQuery) {
  const datasetGithubUrl = getQueryParamMaybe(urlQuery, 'dataset-github')

  if (!datasetGithubUrl) {
    return undefined
  }

  const match = GITHUB_URL_REGEX.exec(removeTrailingSlash(datasetGithubUrl))

  if (!match?.groups) {
    throw new ErrorDatasetGithubUrlPatternInvalid(datasetGithubUrl)
  }

  const { org, repo, branch } = match.groups
  const path = match.groups.path ?? ''

  if ([org, repo, branch].every((s) => isNil(s) || isEmpty(s))) {
    throw new ErrorDatasetGithubUrlComponentsInvalid(datasetGithubUrl, { org, repo, branch, path })
  }

  const datasetGithubRawUrl = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${path}`

  const tag = await axiosFetchOrUndefined<DatasetTag>(urljoin(datasetGithubRawUrl, 'tag.json'))

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
      'genemap.gff': urljoin(datasetGithubRawUrl, 'genemap.gff'),
      'primers.csv': urljoin(datasetGithubRawUrl, 'primers.csv'),
      'qc.json': urljoin(datasetGithubRawUrl, 'qc.json'),
      'reference.fasta': urljoin(datasetGithubRawUrl, 'reference.fasta'),
      'sequences.fasta': urljoin(datasetGithubRawUrl, 'sequences.fasta'),
      'tag.json': urljoin(datasetGithubRawUrl, 'tag.json'),
      'tree.json': urljoin(datasetGithubRawUrl, 'tree.json'),
      'virus_properties.json': urljoin(datasetGithubRawUrl, 'virus_properties.json'),
    },
    params: { defaultGene: undefined, geneOrderPreference: undefined },
    zipBundle: urljoin(datasetGithubRawUrl, 'dataset.zip'),
  }

  const datasets = [currentDataset]
  const currentDatasetName = currentDataset.attributes.name.value
  const defaultDatasetName = currentDatasetName
  const defaultDatasetNameFriendly = currentDataset.attributes.name.valueFriendly ?? currentDatasetName

  await concurrent.forEach(
    async ([filename, fileUrl]) => {
      try {
        await axiosHead(fileUrl)
      } catch (error_: unknown) {
        const error = sanitizeError(error_)

        throw new ErrorDatasetGithubFileMissing(datasetGithubUrl, error, {
          datasetGithubRawUrl,
          filename,
          fileUrl,
        })
      }
    },
    Object.entries(currentDataset.files).filter(([filename, _]) => filename !== 'tag.json'),
  )

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }
}

const GITHUB_URL_EXAMPLE =
  'https://github.com/nextstrain/nextclade_data/tree/master/data/datasets/flu_yam_ha/references/JN993010/versions/2022-07-27T12:00:00Z/files'

const GITHUB_URL_ERROR_HINTS = ` Check the correctness of the URL. If you don't intend to use custom dataset, remove the parameter from the address or restart the application. An example of a correct URL: '${GITHUB_URL_EXAMPLE}'`

export class ErrorDatasetGithubUrlPatternInvalid extends Error {
  public readonly datasetGithubUrl: string

  constructor(datasetGithubUrl: string) {
    super(
      `Dataset GitHub URL (provided using 'dataset-github' URL parameter) is invalid: '${datasetGithubUrl}'.` +
        GITHUB_URL_ERROR_HINTS,
    )
    this.datasetGithubUrl = datasetGithubUrl
  }
}

export class ErrorDatasetGithubUrlComponentsInvalid extends Error {
  public readonly datasetGithubUrl: string
  public readonly org: string
  public readonly repo: string
  public readonly branch: string
  public readonly path?: string

  constructor(
    datasetGithubUrl: string,
    { org, repo, branch, path }: { org: string; repo: string; branch: string; path?: string },
  ) {
    super(
      `Dataset GitHub URL (provided using 'dataset-github' URL parameter) is invalid: '${datasetGithubUrl}'.` +
        ` Detected the following components org='${org}' repo='${repo}' branch='${branch}', path='${path ?? ''}'.` +
        GITHUB_URL_ERROR_HINTS,
    )
    this.datasetGithubUrl = datasetGithubUrl
    this.org = org
    this.repo = repo
    this.branch = branch
    this.path = path
  }
}

export class ErrorDatasetGithubFileMissing extends Error {
  public readonly datasetGithubUrl: string
  public readonly datasetGithubRawUrl: string
  public readonly filename: string
  public readonly fileUrl: string

  constructor(
    datasetGithubUrl: string,
    cause: Error,
    {
      datasetGithubRawUrl,
      filename,
      fileUrl,
    }: {
      datasetGithubRawUrl: string
      filename: string
      fileUrl: string
    },
  ) {
    super(
      `Custom dataset (provided using 'dataset-github' URL parameter) is invalid: the file '${filename}' cannot be retrieved: ${cause.message}. Additional details: provided GitHub URL was: '${datasetGithubUrl}'; deduced raw base GutHub URL was: '${datasetGithubRawUrl}'; attempted to download the file from '${fileUrl}'.`,
    )
    this.cause = cause
    this.datasetGithubUrl = datasetGithubUrl
    this.datasetGithubRawUrl = datasetGithubRawUrl
    this.filename = filename
    this.fileUrl = fileUrl
  }
}
