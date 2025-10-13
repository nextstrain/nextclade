import { sortBy } from 'lodash'
import type { Dataset, DatasetVersion } from 'src/types'

/**
 * Get sort priority for a version tag. Unreleased versions have priority 0 (first),
 * released versions have priority 1 (after unreleased).
 */
function getVersionSortPriority(tag: string): number {
  return tag === 'unreleased' ? 0 : 1
}

/**
 * Get sort value for version date. For unreleased versions, returns 0.
 * For released versions, returns negative timestamp for descending date order.
 */
function getVersionDateSortValue(tag: string, updatedAt: string | undefined): number {
  return tag === 'unreleased' ? 0 : -new Date(updatedAt ?? '').getTime()
}

export function sortDatasetVersions(versions: DatasetVersion[]): DatasetVersion[] {
  return sortBy(versions, [(v) => getVersionSortPriority(v.tag), (v) => getVersionDateSortValue(v.tag, v.updatedAt)])
}

export function sortDatasetsByVersion(datasets: Dataset[]): Dataset[] {
  return sortBy(datasets, [
    (d) => getVersionSortPriority(d.version?.tag ?? ''),
    (d) => getVersionDateSortValue(d.version?.tag ?? '', d.version?.updatedAt),
  ])
}

export function findLatestDatasetVersion(versions: DatasetVersion[]): DatasetVersion | undefined {
  return sortDatasetVersions(versions)[0]
}

export function findLatestDataset(datasets: Dataset[]): Dataset | undefined {
  return sortDatasetsByVersion(datasets)[0]
}

/**
 * Find the latest released version (excluding unreleased versions).
 * This is useful for determining which version should show the "latest" badge.
 */
export function findLatestReleasedVersion(versions: DatasetVersion[]): DatasetVersion | undefined {
  const sortedVersions = sortDatasetVersions(versions)
  return sortedVersions.find((v) => v.tag !== 'unreleased')
}

/**
 * Find the latest released dataset (excluding unreleased versions).
 */
export function findLatestReleasedDataset(datasets: Dataset[]): Dataset | undefined {
  const sortedDatasets = sortDatasetsByVersion(datasets)
  return sortedDatasets.find((d) => d.version?.tag !== 'unreleased')
}

/**
 * Check if a given version tag is the latest released version in a collection.
 * This excludes unreleased versions from the comparison.
 */
export function isLatestReleasedVersion(tag: string, versions: DatasetVersion[]): boolean {
  const latestReleased = findLatestReleasedVersion(versions)
  return latestReleased?.tag === tag
}
