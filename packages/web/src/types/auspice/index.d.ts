/* eslint-disable camelcase */

declare module 'auspice' {
  export declare type AuspiceQuery = Record<string, unknown>

  export declare type AuspiceState = Record<string, unknown>

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
    [key: string]: { value?: string | number; entropy?: number; confidence?: number }
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

  export declare interface AuspiceJsonV2 {
    version?: 'v2'
    meta: {
      title?: string
      description?: string
      build_url?: string
      maintainers?: { name?: string; url?: string }[]
      updated?: string
      colorings: { key?: string; title?: string; type?: string; scale?: string[][] }[]
      display_defaults: {
        branch_label?: string
        color_by?: string
        distance_measure?: string
        geo_resolution?: string
        map_triplicate?: boolean
        transmission_lines?: boolean
      }
      filters?: string[]
      genome_annotations?: Record<
        string,
        { end?: number; seqid?: string; start?: number; strand?: string; type?: string }
      >
      geo_resolutions?: { demes?: Record<string, { latitude?: number; longitude?: number }>; key?: string }[]
      panels?: string[]
    }
    tree?: AuspiceTreeNode
  }
}
