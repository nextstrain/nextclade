import { escape } from 'lodash'
import type { Publication } from 'auspice/src/components/download/downloadModal'

export interface SvgCaptionParams {
  /** Title of the reference tree */
  title?: string
  /** Date of the reference tree */
  updated?: string
  /** Names of the sources of the reference tree data, e.g. "GISAID" */
  dataProvenance: string[]
  datasetPath?: string
  datasetTag?: string
  nextcladeVersion: string
  /** Address of the app */
  origin: string
  /** Date of the download, as text */
  date: string
  /** Sentence telling how many of the tree's tips are shown */
  summary: string
  publications: Publication[]
}

/**
 * Return the text lines (HTML) below the figure in the SVG download of the tree page. They tell which dataset and
 * which Nextclade made the figure, instead of the lines Auspice writes for Nextstrain datasets (their address, data use
 * terms and license)
 */
export function svgCaption({
  title,
  updated,
  dataProvenance,
  datasetPath,
  datasetTag,
  nextcladeVersion,
  origin,
  date,
  summary,
  publications,
}: SvgCaptionParams): string[] {
  const link = escape(origin)
  const treeFacts = [
    ...(updated ? [`updated ${escape(updated)}`] : []),
    ...(dataProvenance.length > 0 ? [`data from ${dataProvenance.map(escape).join(', ')}`] : []),
  ]
  return [
    ...(title ? [escape(title)] : []),
    ...(datasetPath
      ? [`Nextclade dataset ${escape(datasetPath)}${datasetTag ? ` (version ${escape(datasetTag)})` : ''}`]
      : []),
    ...(treeFacts.length > 0 ? [`Reference tree ${treeFacts.join(', ')}`] : []),
    `Made with Nextclade Web ${escape(nextcladeVersion)}, <a href="${link}">${link}</a>, on ${escape(date)}`,
    escape(summary),
    '',
    'Relevant publications:',
    ...publications.map(
      (pub) =>
        `<a href="${escape(pub.href)}">${escape(`${pub.author}, ${pub.title}, ${pub.journal} (${pub.year})`)}</a>`,
    ),
  ]
}
