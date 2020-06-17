export interface MutationElement {
  seqName: string
  position: string
  allele: string
}

export interface MutationElementWithId extends MutationElement {
  id: string
}
