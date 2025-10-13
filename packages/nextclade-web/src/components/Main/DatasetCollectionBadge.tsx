import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import styled from 'styled-components'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { collectionsAtom } from 'src/state/dataset.state'
import { colorHash } from 'src/helpers/colorHash'

export interface DatasetCollectionBadgeProps {
  collectionId: string
  className?: string
}

export function DatasetCollectionBadge({ collectionId, className = 'mr-1 my-0' }: DatasetCollectionBadgeProps) {
  const { t } = useTranslationSafe()
  const collections = useRecoilValue(collectionsAtom)
  const collection = collections[collectionId]

  const title =
    collection?.description ??
    t('This dataset is included into collection "{{collection}}"', { collection: collectionId })

  const badgeStyle = useMemo(() => {
    const backgroundColor = colorHash(collectionId, { lightness: 0.5, saturation: 0.6 })
    return { backgroundColor }
  }, [collectionId])

  return (
    <DatasetCollectionBadgeStyled className={className} color="secondary" title={title} style={badgeStyle}>
      {collection?.title ?? collectionId}
    </DatasetCollectionBadgeStyled>
  )
}

const DatasetCollectionBadgeStyled = styled(Badge)`
  font-size: 0.7rem;
`
