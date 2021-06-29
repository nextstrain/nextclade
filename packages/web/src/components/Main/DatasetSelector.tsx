/* eslint-disable no-loops/no-loops */
import React, { useEffect, useMemo, useState } from 'react'

import { maxBy, mapValues } from 'lodash'
import { connect } from 'react-redux'
import urljoin from 'url-join'
import semver from 'semver'
import styled from 'styled-components'

import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import type { Dataset, DatasetFiles, DatasetFlat, DatasetsJson, DatasetVersion } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { setDataset } from 'src/state/algorithm/algorithm.actions'
import { Dropdown as DropdownBase } from 'src/components/Common/Dropdown'
import type { DropdownOption } from 'src/components/Common/DropdownOption'
import { stringToOption } from 'src/components/Common/DropdownOption'
import { SpinnerWrapped } from 'src/components/Common/Spinner'

const DATA_FULL_DOMAIN = process.env.DATA_FULL_DOMAIN ?? '/'
const DATA_DATASETS_FILE = '_generated/datasets.json'
const DATA_DATASETS_FILE_FULL_URL = urljoin(DATA_FULL_DOMAIN, DATA_DATASETS_FILE)
const thisVersion = process.env.PACKAGE_VERSION ?? ''

export function isCompatible({ min, max }: { min?: string; max?: string }) {
  return semver.gte(thisVersion, min ?? thisVersion) && semver.lte(thisVersion, max ?? thisVersion)
}

const DropdownContainer = styled.div`
  position: relative;
  flex: 0 0 235px;
  margin-right: auto;
  margin-left: 5px;
  height: 40px;

  @media (max-width: 767.98px) {
    margin-left: auto;
    margin-right: auto;
  }
`

const Dropdown = styled(DropdownBase)`
  position: absolute;
  top: 0;
  left: 0;
`

const DropdownLoadingOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  margin: auto;
`

const Spinner = styled(SpinnerWrapped)`
  flex: 1;
  margin: auto;
  height: 100%;
`

const ErrorText = styled.div`
  flex: 1;
  height: 98%;
  margin: auto;
  color: ${(props) => props.theme.danger};
  border-radius: 3px;
`

export function fileUrlsToAbsolute(files: DatasetFiles): DatasetFiles {
  return mapValues(files, (file: string) => urljoin(DATA_FULL_DOMAIN, file))
}

export function getCompatibleDatasets(datasetsJson?: DatasetsJson): Dataset[] {
  const compatibleDatasets: Dataset[] = []

  for (const dataset of datasetsJson?.datasets ?? []) {
    let compatibleVersions: DatasetVersion[] = []
    for (const version of dataset.versions) {
      if (isCompatible(version.compatibility['nextclade-web-version'])) {
        compatibleVersions.push(version)
      }
    }

    compatibleVersions = compatibleVersions.map((ver) => ({ ...ver, files: fileUrlsToAbsolute(ver.files) }))

    if (compatibleVersions.length > 0) {
      compatibleDatasets.push({ ...dataset, versions: compatibleVersions })
    }
  }

  return compatibleDatasets
}

export function getLatestCompatibleDatasets(datasetsJson?: DatasetsJson) {
  const latestDatasetsFlat: DatasetFlat[] = []
  for (const dataset of getCompatibleDatasets(datasetsJson)) {
    const latestVersion = maxBy(dataset.versions, (version) => version.datetime)
    if (latestVersion) {
      latestDatasetsFlat.push({ ...dataset, ...latestVersion })
    }
  }

  const defaultDatasetName = datasetsJson?.settings.defaultDatasetName ?? ''
  const defaultDataset = latestDatasetsFlat.find((dataset) => dataset.name === defaultDatasetName)

  let defaultDatasetNameFriendly = ''
  if (defaultDataset) {
    defaultDatasetNameFriendly = defaultDataset['name-friendly'] // eslint-disable-line sonarjs/no-duplicate-string
  } else if (latestDatasetsFlat.length > 0) {
    defaultDatasetNameFriendly = latestDatasetsFlat[0]['name-friendly']
  }

  return { datasets: latestDatasetsFlat, defaultDatasetName, defaultDatasetNameFriendly }
}

export interface DatasetSelectorProps {
  setDataset(dataset?: DatasetFlat): void
}

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  setDataset,
}

export const DatasetSelector = connect(mapStateToProps, mapDispatchToProps)(DatasetSelectorDisconnected)

export function removeBoolean<T>(value: boolean | undefined | T): T | undefined {
  if (typeof value === 'boolean') {
    return undefined
  }
  return value
}

export function DatasetSelectorDisconnected({ setDataset }: DatasetSelectorProps) {
  const { data: datasetsJson, error, isLoading, isFetching, isError } =
    useAxiosQuery<DatasetsJson>(DATA_DATASETS_FILE_FULL_URL) // prettier-ignore

  const isBusy = isLoading || isFetching

  const { datasets, defaultDatasetNameFriendly } =
    useMemo(() => getLatestCompatibleDatasets(datasetsJson), [datasetsJson]) // prettier-ignore

  const datasetNames = useMemo(() => datasets.map((dataset) => dataset['name-friendly']), [datasets])
  const virusNameOptionDefault = useMemo(() => stringToOption(defaultDatasetNameFriendly), [defaultDatasetNameFriendly])
  const virusNameOptions = useMemo(() => datasetNames.map((datasetName) => stringToOption(datasetName)), [datasetNames])
  const [current, setCurrent] = useState<DropdownOption<string>>(virusNameOptionDefault)

  useEffect(() => {
    setCurrent(virusNameOptionDefault)
  }, [virusNameOptionDefault])

  useEffect(() => {
    const dataset = datasets.find((dataset) => dataset['name-friendly'] === current.label)
    setDataset(dataset)
  }, [current, datasets, setDataset])

  return (
    <DropdownContainer>
      <Dropdown
        identifier="dataset.name"
        options={removeBoolean(!isBusy && virusNameOptions) ?? []}
        defaultOption={removeBoolean(!isBusy && virusNameOptionDefault)}
        value={removeBoolean(!isBusy && current)}
        onOptionChange={setCurrent}
        isDisabled={isBusy}
      />
      {isError && error && (
        <DropdownLoadingOverlay>
          <ErrorText>{`${error?.name}: ${error?.message}`}</ErrorText>
        </DropdownLoadingOverlay>
      )}

      {isBusy && <DropdownLoadingOverlay>{<Spinner type="ThreeDots" size={20} color="#aaa" />}</DropdownLoadingOverlay>}
    </DropdownContainer>
  )
}
