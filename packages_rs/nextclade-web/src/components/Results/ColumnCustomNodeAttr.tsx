import React, { useMemo } from 'react'

import { get } from 'lodash'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'

export interface ColumnCustomNodeAttrProps {
  sequence: AnalysisResult
  attrKey: string
}

export function ColumnCustomNodeAttr({ sequence, attrKey }: ColumnCustomNodeAttrProps) {
  const { index, seqName, customNodeAttributes, phenotypeValues } = sequence
  const { id, attrValue, className } = useMemo(() => {
    const customCladeValue = get(customNodeAttributes, attrKey)
    const phenotypeValue = phenotypeValues?.find((ph) => ph.name === attrKey)?.value?.toFixed(2)
    const id = getSafeId('col-custom-attr', { index, seqName, attrKey })
    const attrValue = customCladeValue ?? phenotypeValue ?? ''
    const className = phenotypeValue ? 'mx-auto' : ''
    return { id, attrValue, className }
  }, [attrKey, customNodeAttributes, index, phenotypeValues, seqName])

  return (
    <div id={id} className="w-100 d-flex">
      <span className={className}>{attrValue}</span>
    </div>
  )
}
