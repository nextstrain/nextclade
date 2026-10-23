declare module 'auspice' {
  export declare type AuspiceQuery = Record<string, unknown>

  export interface AuspiceTreeState {
    name?: string | boolean
    loaded?: boolean
    nodes?: AuspiceReduxNode[]
    visibility?: number[]
    visibilityVersion?: number
    nodeColors?: string[]
    nodeColorsVersion?: number
    tipRadii?: any
    tipRadiiVersion?: number
    branchThickness?: number[]
    branchThicknessVersion?: number
    vaccines?: []
    version?: number
    idxOfInViewRootNode?: number
    visibleStateCounts?: any
    totalStateCounts?: Record<string, Map<string, number>>
    availableBranchLabels?: string[]
    selectedStrain?: any
    selectedClade?: any
    debug?: any
    stateCountAttrs?: any
    /** Pairs of indices of tips with the same name in the main tree and the second tree, which the tanglegram links */
    tangleTipLookup?: [number, number][]
  }

  /** Tree node in the Auspice store: the node of the tree JSON with the links and counts that Auspice adds */
  export declare interface AuspiceReduxNode extends Omit<AuspiceTreeNode, 'children'> {
    arrayIdx: number
    hasChildren: boolean
    children?: AuspiceReduxNode[]
    /** Parent node; the root is its own parent */
    parent: AuspiceReduxNode
    /** Number of tips below the node, including tips that are not visible */
    fullTipCount: number
    tipCount: number
  }

  /** Value of a filter of the sidebar, which the user can turn off and on again in the header */
  export interface AuspiceFilterValue {
    value: string
    active: boolean
  }

  export interface AuspiceFrequenciesState {
    loaded?: boolean
    data?: any
    pivots?: any
    matrix?: any
    projection_pivot?: any
    version?: any
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface AuspiceMeasurementsState {
    // TODO: add fields if this part of state is ever used
  }

  export interface AuspiceControlsState {
    defaults?: {
      distanceMeasure?: string
      layout?: string
      geoResolution?: string
      filters?: Record<string, string[]>
      colorBy?: string
      selectedBranchLabel?: string
      showTransmissionLines?: boolean
      panels?: Record<string, any>
    }
    available?: any
    canTogglePanelLayout?: boolean
    selectedBranch?: any
    selectedNode?: any
    region?: any
    search?: any
    strain?: any
    geneLength?: Record<string, number>
    mutType?: string
    temporalConfidence?: { exists?: boolean; display?: boolean; on?: boolean }
    layout?: string
    distanceMeasure?: string
    dateMin?: Date
    dateMinNumeric?: number
    dateMax?: string
    dateMaxNumeric?: number
    absoluteDateMin?: Date
    absoluteDateMinNumeric?: number
    absoluteDateMax?: string
    absoluteDateMaxNumeric?: number
    colorBy?: string
    colorByConfidence?: boolean
    colorScale?: {
      scale?: Record<string, any>
      continuous?: boolean
      colorBy?: string
      version?: number
      legendValues?: Record<string, any>
      legendBounds?: any
      genotype?: any
    }
    selectedBranchLabel?: string
    analysisSlider?: boolean
    geoResolution?: string
    filters?: Record<string | symbol, AuspiceFilterValue[]>
    showDownload?: boolean
    quickdraw?: boolean
    mapAnimationDurationInMilliseconds?: number
    mapAnimationStartDate?: Date
    mapAnimationCumulative?: boolean
    mapAnimationShouldLoop?: boolean
    animationPlayPauseButton?: string
    panelsAvailable?: string[]
    panelsToDisplay?: string[]
    panelLayout?: string
    /** Name of the second tree, while one is shown */
    showTreeToo?: string | false
    showTangle?: boolean
    showStreamTrees?: boolean
    explodeAttr?: string
    zoomMin?: any
    zoomMax?: any
    branchLengthsToDisplay?: string
    sidebarOpen?: boolean
    treeLegendOpen?: any
    mapLegendOpen?: any
    showOnlyPanels?: boolean
    showTransmissionLines?: boolean
    normalizeFrequencies?: boolean
    coloringsPresentOnTree?: any
    coloringsPresentOnTreeWithConfidence?: any
    absoluteZoomMin?: number
    absoluteZoomMax?: number
  }

  export interface AuspiceEntropyState {
    showCounts?: boolean
    loaded?: boolean
    annotations?: any[]
    lengthSequence?: number
    geneMap?: Record<string, any>
    bars?: any[]
    maxYVal?: number
    zoomMax?: any
    zoomMin?: any
    zoomCoordinates?: [any, any]
    genomeMap?: unknown
  }

  export declare type AuspiceState = {
    metadata?: AuspiceMetadata
    tree?: AuspiceTreeState
    frequencies?: AuspiceFrequenciesState
    controls?: AuspiceControlsState
    entropy?: AuspiceEntropyState
    browserDimensions?: { browserDimensions?: { width?: number; height?: number; docHeight?: number } }
    notifications?: { stack?: any[]; counter?: number }
    narrative?: {
      loaded?: boolean
      blocks?: any
      blockIdx?: any
      pathname?: any
      display?: boolean
      title?: any
    }
    treeToo?: AuspiceTreeState
    general?: { language?: string }
    query?: any
    measurements?: AuspiceMeasurementsState
    /** Panels that the user turned off. Kept by Nextclade's root reducer, not by Auspice */
    panelsHiddenByUser?: string[]
  }

  export declare interface AuspiceTreeNodeAttrs {
    div?: number
    GISAID_clade?: { value?: string }
    author?: { author?: string; paper_url?: string; title?: string; value?: string }
    clade_membership?: { value?: string }
    country?: { value?: string }
    country_exposure?: { value?: string }
    division?: { value?: string }
    division_exposure?: { value?: string }
    gisaid_epi_isl?: { value?: string }
    host?: { value?: string }
    legacy_clade_membership?: { value?: string }
    location?: { value?: string }
    num_date?: { confidence?: [number, number]; value?: number }
    pangolin_lineage?: { value?: number }
    recency?: { value?: number }
    region?: { confidence?: { Asia?: number }; entropy?: number; value?: string }
    subclade_membership?: { value?: string }
    submitting_lab?: { value?: string }
    url?: string
    'Node type'?: { value?: string }
    [key: string]: { value?: string | number; entropy?: number; confidence?: number } | number | string | undefined
  }

  export declare interface AuspiceTreeBranchAttrs {
    labels?: {
      aa?: string
      clade?: string
      mlabel?: string
    }
    mutations?: Record<string, string[]>
  }

  export declare interface AuspiceTreeNode<NodeAttrs = AuspiceTreeNodeAttrs, BranchAttrs = AuspiceTreeBranchAttrs> {
    name: string
    node_attrs?: NodeAttrs
    branch_attrs?: BranchAttrs
    children?: AuspiceTreeNode<NodeAttrs, BranchAttrs>[]
  }

  export interface GeneMapJsonEntry {
    end: number
    seqid?: string
    start: number
    strand?: string
    type?: string
  }

  export type GeneMapJson = { [key: string]: GeneMapJsonEntry }

  export interface DataProvenance {
    name?: string
  }

  export interface CladeNodeAttrDesc {
    name: string
    displayName: string
    description?: string
    hideInWeb?: boolean
    skipAsReference?: boolean
  }

  export declare interface AuspiceMetadata {
    title?: string
    description?: string
    buildUrl?: string
    maintainers?: { name?: string; url?: string }[]
    dataProvenance?: DataProvenance[]
    updated?: string
    colorings: { key?: string; title?: string; type?: string; scale?: string[][] }[]
    /** Display defaults of the tree JSON */
    display_defaults?: {
      branch_label?: string
      color_by?: string
      distance_measure?: string
    }
    displayDefaults?: {
      branch_label?: string
      color_by?: string
      distance_measure?: string
      geo_resolution?: string
      map_triplicate?: boolean
      transmission_lines?: boolean
    }
    filters?: string[]
    /** Number of tips in the tree (state only) */
    mainTreeNumTips?: number
    genomeAnnotations?: GeneMapJson
    /** Genome annotation of the tree JSON: the nucleotide sequence (`nuc`) and the CDSs, by name */
    genome_annotations?: Record<string, unknown>
    geoResolutions?: { demes?: Record<string, { latitude?: number; longitude?: number }>; key?: string }[]
    panels?: string[]
    /** Corner of each panel that its legend is drawn in (state only) */
    legendPlacements?: Record<string, { vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' }>
    extensions?: {
      nextclade?: {
        clade_node_attrs_keys?: CladeNodeAttrDesc[]
      }
    }
  }

  export declare interface AuspiceJsonV2 {
    version?: 'v2'
    meta?: AuspiceMetadata
    tree?: AuspiceTreeNode
  }
}
