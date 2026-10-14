import type { AuspiceState } from 'auspice'
import { DateTime } from 'luxon'
import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { publications } from 'auspice/src/components/download/downloadModal'
import { SVG } from 'auspice/src/components/download/helperFunctions'
import { datasetSummary } from 'auspice/src/components/info/datasetSummary'
import { svgCaption } from 'src/components/Tree/svgCaption'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { DEFAULT_EXPORT_PARAMS, useExportTree, useExportTreeNwk } from 'src/hooks/useExportResults'

const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? ''

const NEXTCLADE_PUBLICATION = {
  author: 'Aksamentov et al.',
  title: 'Nextclade: clade assignment, mutation calling and quality control for viral genomes',
  year: '2021',
  journal: 'Journal of Open Source Software, 6(67), 3773',
  href: 'https://doi.org/10.21105/joss.03773',
}

/** Download offered above the tree, as a button or as a menu entry */
export interface TreeDownload {
  /** Button text, e.g. "SVG" */
  label: string
  /** Button tooltip */
  title: string
  /** Menu entry, e.g. "Figure (SVG)" */
  name: string
  /** Menu entry description */
  description: string
  isAvailable: boolean
  save(): void
}

export interface UseTreeDownloadsParams {
  datasetPath: string | undefined
  datasetTag: string | undefined
}

/**
 * Return the downloads of the tree page: a figure of the tree, drawn by Auspice, and the tree with the sequences placed
 * onto it in Auspice JSON and in Newick format, which the analysis produced, the same files as on the export page
 */
export function useTreeDownloads({ datasetPath, datasetTag }: UseTreeDownloadsParams): TreeDownload[] {
  const { t } = useTranslationSafe()
  const saveSvg = useSaveSvg({ datasetPath, datasetTag })

  const exportTree = useExportTree({ datasetName: datasetPath ?? '' })
  const saveJson = exportTree?.fn
  const exportTreeNwk = useExportTreeNwk({ datasetName: datasetPath ?? '' })
  const saveNwk = exportTreeNwk?.fn

  return useMemo(
    () => [
      {
        label: t('SVG'),
        title: t('Download a figure of the tree, as shown, in SVG format'),
        name: t('Figure (SVG)'),
        description: t('The tree and the entropy chart, as shown, with the dataset and publications below'),
        isAvailable: true,
        save: saveSvg,
      },
      {
        label: t('JSON'),
        title: t('Download phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
          formatName: 'Auspice JSON v2',
        }),
        name: t('Tree (Auspice JSON)'),
        description: t('The whole tree with your sequences, as on the export page'),
        isAvailable: !!saveJson && !exportTree?.isRunning,
        save: () => saveJson?.(DEFAULT_EXPORT_PARAMS.filenameTree),
      },
      {
        label: t('NWK'),
        title: t('Download phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
          formatName: 'Newick',
        }),
        name: t('Tree (Newick)'),
        description: t('The whole tree with your sequences, as on the export page'),
        isAvailable: !!saveNwk && !exportTreeNwk?.isRunning,
        save: () => saveNwk?.(DEFAULT_EXPORT_PARAMS.filenameTreeNwk),
      },
    ],
    [exportTree?.isRunning, exportTreeNwk?.isRunning, saveJson, saveNwk, saveSvg, t],
  )
}

/** Return a function that saves a figure of the tree and of the entropy chart, if shown, with a caption below */
function useSaveSvg({ datasetPath, datasetTag }: UseTreeDownloadsParams) {
  const { t } = useTranslationSafe()
  const dispatch = useDispatch()

  const colorBy = useSelector((state: AuspiceState) => state.controls?.colorBy)
  const metadata = useSelector((state: AuspiceState) => state.metadata)
  const nodes = useSelector((state: AuspiceState) => state.tree?.nodes)
  const visibility = useSelector((state: AuspiceState) => state.tree?.visibility)
  const panelsToDisplay = useSelector((state: AuspiceState) => state.controls?.panelsToDisplay)
  const panelLayout = useSelector((state: AuspiceState) => state.controls?.panelLayout)
  const branchLengthsToDisplay = useSelector((state: AuspiceState) => state.controls?.branchLengthsToDisplay)

  const relevantPublications = useMemo(() => {
    const isColoredByTiters = ['cTiter', 'rb', 'ep', 'ne'].some((x) => !!colorBy?.includes(x))
    return [
      NEXTCLADE_PUBLICATION,
      publications.nextstrain,
      publications.treetime,
      ...(isColoredByTiters ? [publications.titers] : []),
    ]
  }, [colorBy])

  return useCallback(() => {
    const caption = svgCaption({
      title: metadata?.title,
      updated: metadata?.updated,
      dataProvenance: (metadata?.dataProvenance ?? []).flatMap(({ name }) => (name ? [name] : [])),
      datasetPath,
      datasetTag,
      nextcladeVersion: PACKAGE_VERSION,
      origin: window.location.origin,
      date: DateTime.now().toISODate() ?? '',
      summary: datasetSummary({
        nodes: nodes ?? [],
        visibility: visibility ?? [],
        mainTreeNumTips: metadata?.mainTreeNumTips ?? 0,
        branchLengthsToDisplay,
        t,
      }),
      publications: relevantPublications,
    })
    SVG(
      dispatch,
      t,
      metadata,
      nodes,
      visibility,
      'nextclade',
      panelsToDisplay,
      panelLayout,
      relevantPublications,
      caption,
    )
  }, [
    branchLengthsToDisplay,
    datasetPath,
    datasetTag,
    dispatch,
    metadata,
    nodes,
    panelLayout,
    panelsToDisplay,
    relevantPublications,
    t,
    visibility,
  ])
}
