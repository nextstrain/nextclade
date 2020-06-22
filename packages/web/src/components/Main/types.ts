export interface MutationElement {
  seqName: string
  positionZeroBased: string
  allele: string
}

export interface MutationElementWithId extends MutationElement {
  id: string
}

export interface MissingElement {
  seqName: string
  character: string
  begin: number
  end: number
}

export interface MissingElementWithId extends MissingElement {
  id: string
}
