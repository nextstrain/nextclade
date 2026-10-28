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
  /** Horizontal padding of the sidebar around its controls, in pixels */
  export const controlsPadding: number
  /** Window width, in pixels, at or below which the sidebar covers the panels and starts closed */
  export const controlsHiddenWidth: number
  /** Palettes of discrete colorings without a scale in the dataset, by the number of values: `colors[n]` has n colors */
  export const colors: string[][]
  /** Return whether a value of a node attribute is known: missing values and strings such as "unknown" or "?" are not */
  export function isValueValid(value: unknown): boolean
  /** Style and attribution (HTML) of the map tiles */
  export function getMapTilesSettings(): { style: unknown; attribution: string }
}
