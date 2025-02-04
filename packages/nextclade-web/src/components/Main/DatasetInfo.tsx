import { isNil, last } from 'lodash'
import { darken } from 'polished'
import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { colorHash } from 'src/helpers/colorHash'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { firstLetter } from 'src/helpers/string'
import { TFunc, useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { autodetectResultsByDatasetAtom, numberAutodetectResultsAtom } from 'src/state/autodetect.state'
import { AnyType, attrBoolMaybe, attrStrMaybe, DatasetVersion } from 'src/types'
import type { Dataset } from 'src/types'
import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex: 1;
  margin: 0;
`

export const FlexLeft = styled.div`
  flex: 0;
  display: flex;
  flex-direction: column;
  margin: auto 0;
`

export const FlexRight = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  width: 0;
`

export const DatasetName = styled.h4`
  margin-bottom: 0;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DatasetInfoLine = styled.span`
  font-size: 0.9rem;
  padding: 0;
  margin: 0;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:after {
    content: ' ';
    white-space: pre;
  }
`

const DatasetInfoBadgeContainer = styled.div`
  margin: 0.25rem 0;
`

const DatasetInfoBadge = styled(Badge)`
  font-size: 0.7rem;
  padding: 0.17rem 0.33rem;
`

export interface DatasetInfoProps {
  dataset: Dataset
  showSuggestions?: boolean
}

export function DatasetInfo({ dataset, showSuggestions, ...restProps }: DatasetInfoProps) {
  const { t } = useTranslationSafe()
  const { datasetName, datasetRef, datasetUpdatedAt, datasetPath } = useMemo(
    () => formatDatasetInfo(dataset, t),
    [dataset, t],
  )

  return (
    <Container {...restProps}>
      <FlexLeft>
        <DatasetInfoAutodetectProgressCircle dataset={dataset} showSuggestions={showSuggestions} />
      </FlexLeft>

      <FlexRight>
        <DatasetName title={datasetName}>{datasetName}</DatasetName>

        <DatasetInfoBadgeContainer>
          <DatasetInfoBadges dataset={dataset} />
        </DatasetInfoBadgeContainer>

        <DatasetInfoLine title={datasetRef}>{datasetRef}</DatasetInfoLine>
        <DatasetInfoLine title={datasetUpdatedAt}>{datasetUpdatedAt}</DatasetInfoLine>
        <DatasetInfoLine title={datasetPath}>{datasetPath}</DatasetInfoLine>
      </FlexRight>
    </Container>
  )
}

export function formatDatasetInfo(dataset: Dataset, t: TFunc) {
  const { attributes, path, version } = dataset
  const datasetName = attrStrMaybe(attributes, 'name') ?? path
  const datasetRef = t('Reference: {{ ref }}', { ref: formatReference(attributes) })
  const datasetUpdatedAt = t('Updated at: {{updated}}', { updated: formatUpdatedAt(version, t) })
  const datasetPath = t('Dataset name: {{name}}', { name: path })
  const color = colorHash(path, {
    lightness: [0.35, 0.5],
    saturation: [0.35, 0.5],
  })
  return { attributes, path, datasetName, datasetRef, datasetUpdatedAt, datasetPath, color }
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

export function DatasetInfoBadges({ dataset: { path, attributes } }: { dataset: Dataset }) {
  const { t } = useTranslationSafe()

  return (
    <span className="d-flex ml-auto">
      {path.startsWith('nextstrain') ? (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="success"
          title={t('This dataset is provided by {{proj}} developers.', { proj: 'Nextclade' })}
        >
          {t('official')}
        </DatasetInfoBadge>
      ) : (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="info"
          title={t(
            'This dataset is provided by the community members. {{proj}} developers cannot verify correctness of community datasets or provide support for them. Use at own risk. Please contact dataset authors for all questions.',
            { proj: 'Nextclade' },
          )}
        >
          {t('community')}
        </DatasetInfoBadge>
      )}

      {attrBoolMaybe(attributes, 'experimental') && (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="warning"
          title={t(
            'Dataset authors marked this dataset as experimental, which means the dataset is still under development, is of lower quality than usual or has other issues. Use at own risk. Please contact dataset authors for specifics.',
          )}
        >
          {t('experimental')}
        </DatasetInfoBadge>
      )}

      {attrBoolMaybe(attributes, 'deprecated') && (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="secondary"
          title={t(
            'Dataset authors marked this dataset as deprecated, which means the dataset is obsolete, will no longer be updated or is not relevant otherwise. Please contact dataset authors for specifics.',
          )}
        >
          {t('deprecated')}
        </DatasetInfoBadge>
      )}
    </span>
  )
}

export interface DatasetInfoCircleProps {
  dataset: Dataset
  showSuggestions?: boolean
}

function DatasetInfoAutodetectProgressCircle({ dataset, showSuggestions }: DatasetInfoCircleProps) {
  const { attributes, path } = dataset
  const name = attrStrMaybe(attributes, 'name') ?? last(path.split('/')) ?? '?'

  const circleBg = useMemo(() => darken(0.1)(colorHash(path, { saturation: 0.5, reverse: true })), [path])
  const records = useRecoilValue(autodetectResultsByDatasetAtom(path))
  const numberAutodetectResults = useRecoilValue(numberAutodetectResultsAtom)

  const { circleText, countText, percentage } = useMemo(() => {
    if (!showSuggestions || isNil(records)) {
      return {
        circleText: (firstLetter(name) ?? ' ').toUpperCase(),
        percentage: 0,
        countText: '\u00A0',
      }
    }

    if (records.length > 0) {
      const percentage = records.length / numberAutodetectResults
      const circleText = `${(100 * percentage).toFixed(0)}%`
      const countText = `${records.length} / ${numberAutodetectResults}`
      return { circleText, percentage, countText }
    }
    return { circleText: `0%`, percentage: 0, countText: `0 / ${numberAutodetectResults}` }
  }, [showSuggestions, records, numberAutodetectResults, name])

  return (
    <>
      <CircleBorder $percentage={percentage}>
        <Circle $bg={circleBg}>{circleText}</Circle>
      </CircleBorder>

      <CountText>{countText}</CountText>
    </>
  )
}

const CountText = styled.span`
  text-align: center;
  font-size: 0.8rem;
`

interface CircleBorderProps {
  $percentage: number
  $fg?: string
  $bg?: string
}

const CircleBorder = styled.div.attrs<CircleBorderProps>((props) => ({
  style: {
    background: `
      radial-gradient(closest-side, white 79%, transparent 80% 100%),
      conic-gradient(
        ${props.$fg ?? props.theme.success} calc(${props.$percentage} * 100%),
        ${props.$bg ?? 'lightgray'} 0
      )`,
  },
}))<CircleBorderProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  width: 75px;
  height: 75px;
`

const Circle = styled.div<{ $bg?: string; $fg?: string }>`
  display: flex;
  margin: auto;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: ${(props) => props.$bg ?? props.theme.gray700};
  color: ${(props) => props.$fg ?? props.theme.gray100};
  width: 60px;
  height: 60px;
  font-size: 1.2rem;
`
