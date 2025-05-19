import React, { useMemo } from 'react'
import { ExportFileElement, Ul } from 'src/components/Export/ExportTabMain'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { FileIconTsv } from 'src/components/Common/FileIcons'
import { DEFAULT_EXPORT_PARAMS, useExportUnknownSeqTsv } from 'src/hooks/useExportResults'

export function ExportPageUnknownDataset() {
  const { t } = useTranslationSafe()
  const { isRunning, isDone, fn: exportUnknownTsv } = useExportUnknownSeqTsv()
  const exportParams = useMemo(() => DEFAULT_EXPORT_PARAMS, [])

  return (
    <Ul>
      <ExportFileElement
        Icon={FileIconTsv}
        filename={exportParams.filenameUnknownTsv}
        HelpMain={t('List of unclassified sequences in {{formatName}} format.', { formatName: 'TSV' })}
        HelpDetails={t('Contains names of sequences for which Nextclade could not find a matching dataset')}
        HelpDownload={t('Download list of unclassified sequences in {{formatName}} format', { formatName: 'TSV' })}
        onDownload={exportUnknownTsv}
        isRunning={isRunning}
        isDone={isDone}
      />
    </Ul>
  )
}
