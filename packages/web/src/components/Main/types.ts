export interface MutationElement {
  seqName: string
  positionZeroBased: string
  allele: string
}

export interface MutationElementWithId extends MutationElement {
  id: string
}

export interface InvalidElement {
  seqName: string
  character: string
  begin: number
  end: number
}

export interface InvalidElementWithId extends InvalidElement {
  id: string
}
