declare module 'auspice/src/util/getGenotype' {
  /** Return the color-by key of the genotype at 1-based positions of a CDS (or of `nuc`), e.g. `gt-S_484` */
  export function encodeColorByGenotype(params: { gene: string; positions: number[] }): string | null
}
