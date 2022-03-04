import React from 'react'

import { get } from 'lodash'

import type { AnalysisResult, CladeNodeAttr } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'

export interface ColumnCustomNodeAttrProps {
  sequence: AnalysisResult
  attr: CladeNodeAttr
}

export function ColumnCustomNodeAttr({ sequence, attr }: ColumnCustomNodeAttrProps) {
  const { seqName, customNodeAttributes } = sequence
  const attrValue = get(customNodeAttributes, attr.name, '')

  const id = getSafeId('col-custom-attr', { seqName, key: attr.name })

  return (
    <div id={id} className="w-100">
      {attrValue}
    </div>
  )
}
