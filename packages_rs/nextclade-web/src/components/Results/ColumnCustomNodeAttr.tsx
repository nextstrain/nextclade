import React from 'react'

import { get } from 'lodash'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'

export interface ColumnCustomNodeAttrProps {
  sequence: AnalysisResult
  attrKey: string
}

export function ColumnCustomNodeAttr({ sequence, attrKey }: ColumnCustomNodeAttrProps) {
  const { index, seqName, customNodeAttributes } = sequence
  const attrValue = get(customNodeAttributes, attrKey, '')

  const id = getSafeId('col-custom-attr', { index, seqName, attrKey })

  return (
    <div id={id} className="w-100">
      {attrValue}
    </div>
  )
}
