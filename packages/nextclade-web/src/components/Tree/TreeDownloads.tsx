import React from 'react'
import { FaDownload } from 'react-icons/fa'
import { TreeTabButton, TreeTabButtonGroup } from 'src/components/Tree/TreeTabButton'
import { TreeDownloadsMenu } from 'src/components/Tree/TreeDownloadsMenu'
import { TreeDownload, useTreeDownloads } from 'src/components/Tree/useTreeDownloads'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface TreeDownloadsProps {
  datasetPath: string | undefined
  datasetTag: string | undefined
  /** Fold all downloads into one menu, which leaves room for the other content of the tree header */
  isCompact: boolean
}

/** Download buttons of the tree page: the figure of the tree and the tree files of the analysis */
export function TreeDownloads({ datasetPath, datasetTag, isCompact }: TreeDownloadsProps) {
  const { t } = useTranslationSafe()
  const downloads = useTreeDownloads({ datasetPath, datasetTag })

  if (isCompact) {
    return (
      <TreeTabButtonGroup>
        <TreeDownloadsMenu label={t('Download')} title={t('Downloads of the tree')} downloads={downloads} />
      </TreeTabButtonGroup>
    )
  }

  return (
    <TreeTabButtonGroup>
      {downloads.map((download) => (
        <TreeDownloadButton key={download.name} download={download} />
      ))}
    </TreeTabButtonGroup>
  )
}

function TreeDownloadButton({ download }: { download: TreeDownload }) {
  return (
    <TreeTabButton type="button" onClick={download.save} disabled={!download.isAvailable} title={download.title}>
      <FaDownload />
      {download.label}
    </TreeTabButton>
  )
}
