import type { AaSub, CladeNodeAttrFounderInfo, NucSub, PrivateAaMutations, PrivateNucMutations } from '_SchemaRoot'
import { REF_NODE_CLADE_FOUNDER, REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
import { AnalysisResult } from 'src/types'

/** Internal search identifier for clade-like attributes */
export function getCladeNodeAttrFounderSearchId(attrKey: string): string {
  return `__founder_of_${attrKey}__`
}

export function findCladeNodeAttrFounderInfo(
  cladeNodeAttrFounderInfo: Record<string, CladeNodeAttrFounderInfo> | undefined,
  searchId: string,
): CladeNodeAttrFounderInfo | undefined {
  return Object.entries(cladeNodeAttrFounderInfo ?? {}).find(
    ([attr, _]) => searchId === getCladeNodeAttrFounderSearchId(attr),
  )?.[1]
}

export function getNucMutations(
  analysisResult: AnalysisResult,
  refNodeName: string,
):
  | {
      subs: NucSub[]
      relMuts?: PrivateNucMutations
    }
  | undefined {
  // Reference sequence
  if (refNodeName === REF_NODE_ROOT) {
    return { subs: analysisResult.substitutions, relMuts: undefined }
  }

  // Parent node
  if (refNodeName === REF_NODE_PARENT) {
    return {
      subs: analysisResult.privateNucMutations?.privateSubstitutions ?? [],
      relMuts: analysisResult.privateNucMutations,
    }
  }

  // Clade founder
  if (refNodeName === REF_NODE_CLADE_FOUNDER) {
    const cladeMuts = analysisResult.cladeFounderInfo?.nucMutations
    if (!cladeMuts) {
      return undefined
    }
    return {
      subs: cladeMuts.privateSubstitutions,
      relMuts: cladeMuts,
    }
  }

  // Clade-like attribute founder
  // eslint-disable-next-line no-lone-blocks
  {
    const founderInfo = findCladeNodeAttrFounderInfo(analysisResult.cladeNodeAttrFounderInfo, refNodeName)
    if (founderInfo) {
      const cladeMuts = founderInfo?.nucMutations
      if (!cladeMuts) {
        return undefined
      }
      return {
        subs: cladeMuts.privateSubstitutions,
        relMuts: cladeMuts,
      }
    }
  }

  // Custom node
  const relMuts = analysisResult.relativeNucMutations?.find((m) => m.search.search.name === refNodeName)?.result?.muts
  if (!relMuts) {
    return undefined
  }
  return {
    subs: relMuts.privateSubstitutions,
    relMuts,
  }
}

export function getAaMutations(
  analysisResult: AnalysisResult,
  refNodeName: string,
):
  | {
      aaSubs: AaSub[]
      relAaMuts?: PrivateAaMutations[]
    }
  | undefined {
  // Reference sequence
  if (refNodeName === REF_NODE_ROOT) {
    return { aaSubs: analysisResult.aaSubstitutions, relAaMuts: undefined }
  }

  // Parent node
  if (refNodeName === REF_NODE_PARENT) {
    const relAaMuts = Object.values(analysisResult.privateAaMutations ?? {}).flat()
    const aaSubs = relAaMuts.flatMap((m) => m.privateSubstitutions)
    return { aaSubs, relAaMuts }
  }

  // Clade founder
  if (refNodeName === REF_NODE_CLADE_FOUNDER) {
    const muts = analysisResult.cladeFounderInfo?.aaMutations
    if (!muts) {
      return undefined
    }
    const relAaMuts = Object.values(muts).flat()
    const aaSubs = relAaMuts.flatMap((m) => m.privateSubstitutions)
    return { aaSubs, relAaMuts }
  }

  // Clade-like attribute founder
  // eslint-disable-next-line no-lone-blocks
  {
    const founderInfo = findCladeNodeAttrFounderInfo(analysisResult.cladeNodeAttrFounderInfo, refNodeName)
    if (founderInfo) {
      const cladeMuts = founderInfo?.aaMutations
      if (!cladeMuts) {
        return undefined
      }
      const relAaMuts = Object.values(cladeMuts).flat()
      const aaSubs = relAaMuts.flatMap((m) => m.privateSubstitutions)
      return { aaSubs, relAaMuts }
    }
  }

  // Custom node
  const muts = analysisResult.relativeAaMutations?.find((m) => m.search.search.name === refNodeName)?.result?.muts
  if (!muts) {
    return undefined
  }
  const relAaMuts = Object.values(muts).flat()
  const aaSubs = relAaMuts.flatMap((m) => m.privateSubstitutions)
  return { aaSubs, relAaMuts }
}
