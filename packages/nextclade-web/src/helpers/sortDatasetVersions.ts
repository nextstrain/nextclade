import { sortBy } from 'lodash'
import type { Dataset, DatasetVersion } from 'src/types'

export function sortDatasetVersions(versions: DatasetVersion[]): DatasetVersion[] {
  return sortBy(versions, [(v) => v.tag !== 'unreleased', (v) => v.updatedAt ?? '']).reverse()
}

export function sortDatasetsByVersion(datasets: Dataset[]): Dataset[] {
  return sortBy(datasets, [(d) => d.version?.tag !== 'unreleased', (d) => d.version?.updatedAt ?? '']).reverse()
}

export function findLatestDatasetVersion(versions: DatasetVersion[]): DatasetVersion | undefined {
  return sortDatasetVersions(versions)[0]
}

export function findLatestDataset(datasets: Dataset[]): Dataset | undefined {
  return sortDatasetsByVersion(datasets)[0]
}
