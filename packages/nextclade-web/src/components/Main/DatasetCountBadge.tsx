import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { numberTopSuggestedDatasetsAtom } from 'src/state/autodetect.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function DatasetCountBadge() {
  const { t } = useTranslationSafe()
  const numberTopSuggestedDatasets = useRecoilValue(numberTopSuggestedDatasetsAtom)

  const title = useMemo(
    () => t('Choose between {{ n }} datasets', { n: numberTopSuggestedDatasets }),
    [numberTopSuggestedDatasets, t],
  )

  return (
    <Badge title={title} className="ml-1" color="secondary" size="sm">
      {numberTopSuggestedDatasets}
    </Badge>
  )
}
