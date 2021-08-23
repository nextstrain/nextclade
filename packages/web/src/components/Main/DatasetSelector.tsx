/* eslint-disable no-loops/no-loops */
import React, { useEffect, useMemo, useState } from 'react'

import { maxBy, mapValues } from 'lodash'
import { connect } from 'react-redux'
import urljoin from 'url-join'
import semver from 'semver'
import styled from 'styled-components'

import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import type { Dataset, DatasetFiles, DatasetFlat, DatasetsIndexJson, DatasetVersion } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { setDataset } from 'src/state/algorithm/algorithm.actions'
import { Dropdown as DropdownBase } from 'src/components/Common/Dropdown'
import type { DropdownOption } from 'src/components/Common/DropdownOption'
import { stringToOption } from 'src/components/Common/DropdownOption'
import { SpinnerWrapped } from 'src/components/Common/Spinner'

const DATA_FULL_DOMAIN = process.env.DATA_FULL_DOMAIN ?? '/'
const DATA_INDEX_FILE = 'index.json'
const DATA_INDEX_FILE_FULL_URL = urljoin(DATA_FULL_DOMAIN, DATA_INDEX_FILE)
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

export function getEnabledDatasets(datasets?: Dataset[]): Dataset[] {
  const enbledDatasets: Dataset[] = []
  for (const dataset of datasets ?? []) {
    if (!dataset.enabled) {
      continue // eslint-disable-line no-continue
    }

    const enabledDataset: Dataset = { ...dataset }
    enabledDataset.versions = []

    for (const version of dataset.versions) {
      if (version.enabled) {
        enabledDataset.versions.push(version)
      }
    }

    if (enabledDataset.versions.length > 0) {
      enbledDatasets.push(enabledDataset)
    }
  }

  return enbledDatasets
}

export function getCompatibleDatasets(datasets?: Dataset[]): Dataset[] {
  const compatibleDatasets: Dataset[] = []

  for (const dataset of datasets ?? []) {
    let compatibleVersions: DatasetVersion[] = []
    for (const version of dataset.versions) {
      if (isCompatible(version.compatibility.nextcladeWeb)) {
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

export function getLatestDatasets(datasets?: Dataset[]): DatasetFlat[] {
  const latestDatasetsFlat: DatasetFlat[] = []
  for (const dataset of datasets ?? []) {
    const latestVersion = maxBy(dataset.versions, (version) => version.tag)
    if (latestVersion) {
      latestDatasetsFlat.push({ ...dataset, ...latestVersion })
    }
  }
  return latestDatasetsFlat
}

export function getLatestCompatibleEnabledDatasets(datasetsIndexJson?: DatasetsIndexJson) {
  const datasets = getLatestDatasets(getCompatibleDatasets(getEnabledDatasets(datasetsIndexJson?.datasets)))

  const defaultDatasetName = datasetsIndexJson?.settings.defaultDatasetName ?? ''
  const defaultDataset = datasets.find((dataset) => dataset.name === defaultDatasetName)
  let defaultDatasetNameFriendly = ''
  if (defaultDataset) {
    defaultDatasetNameFriendly = defaultDataset.nameFriendly
  } else if (datasets.length > 0) {
    defaultDatasetNameFriendly = datasets[0].nameFriendly
  }

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly }
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
  const { data: datasetsIndexJson, error, isLoading, isFetching, isError } =
    useAxiosQuery<DatasetsIndexJson>(DATA_INDEX_FILE_FULL_URL) // prettier-ignore

  const isBusy = isLoading || isFetching

  const { datasets, defaultDatasetNameFriendly } =
    useMemo(() => getLatestCompatibleEnabledDatasets(datasetsIndexJson), [datasetsIndexJson]) // prettier-ignore

  const datasetNames = useMemo(() => datasets.map((dataset) => dataset.nameFriendly), [datasets])
  const virusNameOptionDefault = useMemo(() => stringToOption(defaultDatasetNameFriendly), [defaultDatasetNameFriendly])
  const virusNameOptions = useMemo(() => datasetNames.map((datasetName) => stringToOption(datasetName)), [datasetNames])
  const [current, setCurrent] = useState<DropdownOption<string>>(virusNameOptionDefault)

  useEffect(() => {
    setCurrent(virusNameOptionDefault)
  }, [virusNameOptionDefault])

  useEffect(() => {
    const dataset = datasets.find((dataset) => dataset.nameFriendly === current.label)
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
          <ErrorText>{`${error.name}: ${error.message}`}</ErrorText>
        </DropdownLoadingOverlay>
      )}

      {isBusy && <DropdownLoadingOverlay>{<Spinner type="ThreeDots" size={20} color="#aaa" />}</DropdownLoadingOverlay>}
    </DropdownContainer>
  )
}
