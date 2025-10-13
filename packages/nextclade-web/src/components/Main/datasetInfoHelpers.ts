import { darken } from 'polished'
import { colorHash } from 'src/helpers/colorHash'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { sortDatasetVersions } from 'src/helpers/sortDatasetVersions'
import { TFunc } from 'src/helpers/useTranslationSafe'
import { AnyType, attrStrMaybe, Dataset, DatasetVersion } from 'src/types'

export interface VersionStatus {
  color: 'success' | 'warning' | 'danger'
  label: string
  isUnreleased: boolean
}

export function getVersionStatus(
  currentTag: string | undefined,
  versions: DatasetVersion[] | undefined,
  t: (key: string) => string,
): VersionStatus {
  if (currentTag === 'unreleased') {
    return { color: 'danger', label: t('unreleased'), isUnreleased: true }
  }

  if (!versions || versions.length <= 1) {
    return { color: 'success', label: t('latest'), isUnreleased: false }
  }

  const sortedVersions = sortDatasetVersions(versions)
  
  // Find the latest released version (first non-unreleased version)
  const latestReleasedVersion = sortedVersions.find((v) => v.tag !== 'unreleased')
  const isLatest = latestReleasedVersion?.tag === currentTag

  if (isLatest) {
    return { color: 'success', label: t('latest'), isUnreleased: false }
  }

  return { color: 'warning', label: t('outdated'), isUnreleased: false }
}

export function datasetColor(datasetName: string) {
  return darken(0.1)(colorHash(datasetName, { lightness: [0.35, 0.5], saturation: [0.35, 0.5] }))
}

export function formatReference(attributes: Record<string, AnyType> | undefined) {
  const name = attrStrMaybe(attributes, 'reference name') ?? 'unknown'
  const accession = attrStrMaybe(attributes, 'reference accession')
  if (accession) {
    return `${name} (${accession})`
  }
  return name
}

export function formatUpdatedAt(version: DatasetVersion | undefined, t: TFunc) {
  let updatedAt = version?.updatedAt ? formatDateIsoUtcSimple(version?.updatedAt) : t('unknown')
  if (version?.tag === 'unreleased') {
    updatedAt = `${updatedAt} (${t('unreleased')})`
  }
  return updatedAt ?? t('unknown')
}

export function formatDatasetInfo(dataset: Dataset, t: TFunc) {
  const { attributes, path, version } = dataset
  const datasetName = attrStrMaybe(attributes, 'name') ?? path
  const datasetRef = t('Reference: {{ ref }}', { ref: formatReference(attributes) })
  const datasetUpdatedAt = t('Updated at: {{updated}}', { updated: formatUpdatedAt(version, t) })
  const datasetPath = t('Dataset name: {{name}}', { name: path })
  const color = datasetColor(path)
  return { attributes, path, datasetName, datasetRef, datasetUpdatedAt, datasetPath, color }
}
