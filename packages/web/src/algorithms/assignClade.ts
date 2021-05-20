import { get } from 'lodash'

import type { AnalysisResult } from 'src/algorithms/types'
import type { AuspiceTreeNode } from 'auspice'

export function assignClade(analysisResult: AnalysisResult, match: AuspiceTreeNode) {
  const clade = get(match, 'node_attrs.clade_membership.value') as string | undefined
  if (!clade) {
    throw new Error('Unable to assign clade: best matching reference node does not have clade membership')
  }

  return { seqName: analysisResult.seqName, clade }
}
