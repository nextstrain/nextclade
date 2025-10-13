import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import styled, { useTheme } from 'styled-components'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { collectionsAtom, datasetServerUrlAtom } from 'src/state/dataset.state'
import { colorHash } from 'src/helpers/colorHash'
import { getTextColor } from 'src/helpers/getTextColor'

export interface DatasetCollectionBadgeProps {
  collectionId: string
  className?: string
}

export function DatasetCollectionBadge({ collectionId, className = 'mr-1 my-0' }: DatasetCollectionBadgeProps) {
  const { t } = useTranslationSafe()
  const theme = useTheme()
  const collections = useRecoilValue(collectionsAtom)
  const datasetServerUrl = useRecoilValue(datasetServerUrlAtom)
  const collection = collections[collectionId]

  const title =
    collection?.description ??
    t('This dataset is included into collection "{{collection}}"', { collection: collectionId })

  const badgeStyle = useMemo(() => {
    // Use collection color if available, otherwise fall back to colorHash
    const backgroundColor = collection?.color ?? colorHash(collectionId, { lightness: 0.5, saturation: 0.6 })
    const color = getTextColor(theme, backgroundColor)
    return { backgroundColor, color }
  }, [collection?.color, collectionId, theme])

  const iconUrl = useMemo(() => {
    if (!collection?.icon || !datasetServerUrl) return undefined
    // Icon is relative to dataset server URL
    return `${datasetServerUrl.replace(/\/$/, '')}/${collection.icon.replace(/^\//, '')}`
  }, [collection?.icon, datasetServerUrl])

  return (
    <DatasetCollectionBadgeStyled className={className} color="secondary" title={title} style={badgeStyle}>
      {iconUrl && <BadgeIcon src={iconUrl} alt="" />}
      {collection?.title ?? collectionId}
    </DatasetCollectionBadgeStyled>
  )
}

const DatasetCollectionBadgeStyled = styled(Badge)`
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const BadgeIcon = styled.img`
  width: 0.7rem;
  height: 0.7rem;
  object-fit: contain;
`
