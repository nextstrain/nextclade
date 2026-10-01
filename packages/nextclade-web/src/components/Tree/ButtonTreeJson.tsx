import React, { useCallback } from 'react'
import { FaDownload } from 'react-icons/fa'
import { TreeTabButton } from 'src/components/Tree/TreeTabButton'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { DEFAULT_EXPORT_PARAMS, useExportTree } from 'src/hooks/useExportResults'

export interface ButtonTreeJsonProps {
  datasetName: string
}

/** Download the phylogenetic tree with the sequences placed onto it, the same file as on the export page */
export function ButtonTreeJson({ datasetName }: ButtonTreeJsonProps) {
  const { t } = useTranslationSafe()
  const exportTree = useExportTree({ datasetName })
  const download = exportTree?.fn
  const onClick = useCallback(() => download?.(DEFAULT_EXPORT_PARAMS.filenameTree), [download])

  return (
    <TreeTabButton
      type="button"
      onClick={onClick}
      disabled={!download || exportTree?.isRunning}
      title={t('Download phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
        formatName: 'Auspice JSON v2',
      })}
    >
      <FaDownload />
      {t('JSON')}
    </TreeTabButton>
  )
}
