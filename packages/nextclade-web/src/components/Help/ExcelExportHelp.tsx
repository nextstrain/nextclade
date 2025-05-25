import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'

export function ExcelExportHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton>
      <p>{t('Export analysis results into an Excel workbook.')}</p>

      <p>{t('This is similar to the CSV/TSV outputs, but for all datasets at once - one dataset per sheet.')}</p>
    </InfoButton>
  )
}
