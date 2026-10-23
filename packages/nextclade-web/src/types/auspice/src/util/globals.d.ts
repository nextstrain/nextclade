declare module 'auspice/src/util/globals' {
  /** Key of the filter of tips by name */
  export const strainSymbol: unique symbol
  /** Key of the filter of tips by genotype */
  export const genotypeSymbol: unique symbol
  /** Name of the nucleotide sequence in genotype color-bys, as opposed to CDS names */
  export const nucleotide_gene: string
  /** Visibility of a node that both the tree and the map show */
  export const NODE_VISIBLE: number
  /** Width of the controls of the sidebar, in pixels */
  export const controlsWidth: number
  /** Style and attribution (HTML) of the map tiles */
  export function getMapTilesSettings(): { style: unknown; attribution: string }
}
