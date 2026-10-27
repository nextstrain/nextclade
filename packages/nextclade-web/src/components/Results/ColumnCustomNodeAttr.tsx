import React, { useMemo } from 'react'

import { get } from 'lodash'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { CladeColorValue } from 'src/components/Results/CladeColorSwatch'
import type { CladeColor } from 'src/components/Results/cladeColor'

export interface ColumnCustomNodeAttrProps {
  sequence: AnalysisResult
  attrKey: string
  /** How the tree draws the tips of the value, for a clade-like attribute that the tree offers as a coloring */
  color?: CladeColor
}

export function ColumnCustomNodeAttr({ sequence, attrKey, color }: ColumnCustomNodeAttrProps) {
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
      <span className={className}>
        {color ? (
          <CladeColorValue id={`${id}-show-on-tree`} attrKey={attrKey} value={attrValue} color={color} />
        ) : (
          attrValue
        )}
      </span>
    </div>
  )
}
