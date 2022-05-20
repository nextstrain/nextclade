import React from 'react'

import { last } from 'lodash'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import urljoin from 'url-join'
import semver from 'semver'

import { LayoutMain } from 'src/components/Layout/LayoutMain'
import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import type { Dataset, DatasetFiles, DatasetRef, DatasetsIndexJson, DatasetVersion } from 'src/algorithms/types'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { formatCompatibility } from 'src/helpers/formatCompatibility'

const DATA_FULL_DOMAIN = process.env.DATA_FULL_DOMAIN ?? '/'
const DATA_INDEX_FILE = 'index.json'
const DATA_INDEX_FILE_FULL_URL = urljoin(DATA_FULL_DOMAIN, DATA_INDEX_FILE)
const thisVersion = process.env.PACKAGE_VERSION ?? ''

export const Ul = styled.ul`
  list-style: none;
  padding-left: 0.5rem;
`

export const Li = styled.li``

export interface DatasetFileProps {
  file: string
}

export function DatasetFile({ file }: DatasetFileProps) {
  return (
    <LinkExternal download href={urljoin(DATA_FULL_DOMAIN, file)}>
      {last(file.split('/'))}
    </LinkExternal>
  )
}

export interface DatasetFilesProps {
  files: DatasetFiles
}

export function DatasetFilesView({ files }: DatasetFilesProps) {
  return (
    <Ul>
      {Object.entries(files).map(([filetype, url]) => (
        <Li key={filetype}>
          <DatasetFile file={url} />
        </Li>
      ))}
    </Ul>
  )
}

export interface DatasetVersionProps {
  version: DatasetVersion
}

export function DatasetVersionView({ version }: DatasetVersionProps) {
  const { t } = useTranslationSafe()

  const cliMin = version.compatibility.nextcladeCli.min
  const cliMax = version.compatibility.nextcladeCli.max
  const webMin = version.compatibility.nextcladeWeb.min
  const webMax = version.compatibility.nextcladeWeb.max

  const isCompatible = semver.gte(thisVersion, webMin ?? thisVersion) && semver.lte(thisVersion, webMax ?? thisVersion)

  return (
    <tr>
      <td>{formatDateIsoUtcSimple(version.tag)}</td>
      <td>{version.comment}</td>
      <td>{version.enabled ? t('Yes') : t('No')}</td>
      <td>{formatCompatibility(cliMin, cliMax)}</td>
      <td>{formatCompatibility(webMin, webMax)}</td>
      <td>{isCompatible ? t('Yes') : t('No')}</td>
      <td>
        <DatasetFilesView files={version.files} />
      </td>
      <td>
        {
          <LinkExternal download href={urljoin(DATA_FULL_DOMAIN, version.zipBundle)}>
            {last(version.zipBundle.split('/'))}
          </LinkExternal>
        }
      </td>
    </tr>
  )
}

export interface DatasetRefViewProps {
  datasetRef: DatasetRef
}

export function DatasetRefView({ datasetRef }: DatasetRefViewProps) {
  const { t } = useTranslationSafe()
  const { strainName, accession, source } = datasetRef.reference
  return (
    <Row>
      <Col>
        <h4>{`Reference: ${strainName} (${source}: ${accession})`}</h4>

        <h5>{t('Versions')}</h5>

        <TableSlimWithBorders>
          <thead>
            <tr>
              <th>{t('Released (UTC)')}</th>
              <th>{t('Changes')}</th>
              <th>{t('Enabled')}</th>
              <th>{t('Compat. CLI version')}</th>
              <th>{t('Compat. Web version')}</th>
              <th>{t('Compatible')}</th>
              <th>{t('Files')}</th>
              <th>{t('Zip bundle')}</th>
            </tr>
          </thead>
          <tbody>
            {datasetRef.versions.map((version) => (
              <DatasetVersionView key={version.tag} version={version} />
            ))}
          </tbody>
        </TableSlimWithBorders>
      </Col>
    </Row>
  )
}

export interface DatasetViewProps {
  dataset: Dataset
  isDefault: boolean
}

export function DatasetView({ dataset, isDefault }: DatasetViewProps) {
  const { t } = useTranslationSafe()

  return (
    <Row noGutters className="mt-3">
      <Col>
        <h3>
          {dataset.nameFriendly}
          {isDefault && <sup className="text-small ml-2">{t('(default)')}</sup>}
        </h3>

        {dataset.datasetRefs.map((ref) => (
          <DatasetRefView key={ref.reference.accession} datasetRef={ref} />
        ))}
      </Col>
    </Row>
  )
}

export interface DatasetListProps {
  datasetsIndexJson: DatasetsIndexJson
}

export function DatasetList({ datasetsIndexJson }: DatasetListProps) {
  const { defaultDatasetName } = datasetsIndexJson.settings

  return (
    <div>
      {datasetsIndexJson.datasets.map((dataset) => (
        <DatasetView key={dataset.name} dataset={dataset} isDefault={dataset.name === defaultDatasetName} />
      ))}
    </div>
  )
}

export function DataPage() {
  const { t } = useTranslationSafe()

  const {
    data: datasetsIndexJson,
    error,
    isLoading,
    isFetching,
    isError,
  } = useAxiosQuery<DatasetsIndexJson>(DATA_INDEX_FILE_FULL_URL)

  return (
    <LayoutMain>
      <Row noGutters className="landing-page-row mx-auto">
        <Col>
          <Row noGutters>
            <Col>
              <h2 className="text-center">{t('Datasets')}</h2>
            </Col>
          </Row>

          <Row noGutters>
            <Col>{(isLoading || isFetching) && <span className="text-info">{'Loading...'}</span>}</Col>
          </Row>

          <Row noGutters>
            <Col>{isError && error && <span className="text-danger">{`${error.name}: ${error.message}`}</span>}</Col>
          </Row>

          {datasetsIndexJson && <DatasetList datasetsIndexJson={datasetsIndexJson} />}
        </Col>
      </Row>
    </LayoutMain>
  )
}
