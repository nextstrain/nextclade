import { sortBy } from 'lodash'
import type { Dataset, DatasetVersion } from 'src/types'

export function sortDatasetVersions(versions: DatasetVersion[]): DatasetVersion[] {
  return sortBy(versions, [
    (v) => (v.tag === 'unreleased' ? 0 : 1),
    (v) => (v.tag === 'unreleased' ? 0 : -new Date(v.updatedAt ?? '').getTime()),
  ])
}

export function sortDatasetsByVersion(datasets: Dataset[]): Dataset[] {
  return sortBy(datasets, [
    (d) => (d.version?.tag === 'unreleased' ? 0 : 1),
    (d) => (d.version?.tag === 'unreleased' ? 0 : -new Date(d.version?.updatedAt ?? '').getTime()),
  ])
}

export function findLatestDatasetVersion(versions: DatasetVersion[]): DatasetVersion | undefined {
  return sortDatasetVersions(versions)[0]
}

export function findLatestDataset(datasets: Dataset[]): Dataset | undefined {
  return sortDatasetsByVersion(datasets)[0]
}
