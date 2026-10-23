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
  /** Dataset of the second tree, drawn next to the main tree */
  secondDataset?: { path: string; tag?: string }
  /**
   * Attribution of the map tiles (HTML), when the figure holds the map. The figure has no attribution of its own, as
   * the screen has, and the license of the map data requires one
   */
  mapAttribution?: string
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
  secondDataset,
  mapAttribution,
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
    ...(datasetPath ? [`Nextclade dataset ${datasetName(datasetPath, datasetTag)}`] : []),
    ...(secondDataset ? [`Second tree: Nextclade dataset ${datasetName(secondDataset.path, secondDataset.tag)}`] : []),
    ...(treeFacts.length > 0 ? [`Reference tree ${treeFacts.join(', ')}`] : []),
    `Made with Nextclade Web ${escape(nextcladeVersion)}, <a href="${link}">${link}</a>, on ${escape(date)}`,
    escape(summary),
    // The attribution is the fixed text of Auspice's map settings, with its links
    ...(mapAttribution ? [`Map: ${mapAttribution}`] : []),
    '',
    'Relevant publications:',
    ...publications.map(
      (pub) =>
        `<a href="${escape(pub.href)}">${escape(`${pub.author}, ${pub.title}, ${pub.journal} (${pub.year})`)}</a>`,
    ),
  ]
}

function datasetName(path: string, tag: string | undefined): string {
  return `${escape(path)}${tag ? ` (version ${escape(tag)})` : ''}`
}
