export interface MutationElement {
  seqName: string
  positionZeroBased: string
  allele: string
}

export interface MutationElementWithId extends MutationElement {
  id: string
}
