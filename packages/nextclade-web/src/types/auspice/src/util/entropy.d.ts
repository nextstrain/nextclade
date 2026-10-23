declare module 'auspice/src/util/entropy' {
  /** Return the CDS of the given name in the genome map of the Auspice store, if any */
  export function getCdsByName(genomeMap: unknown, name: string): unknown
}
