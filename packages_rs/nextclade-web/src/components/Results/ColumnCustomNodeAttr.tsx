import React, { useCallback, useMemo, useState } from 'react'
import { get, values } from 'lodash'
import styled from 'styled-components'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { Tooltip } from './Tooltip'

const Table = styled(TableSlimWithBorders)`
  margin-top: 1rem;
`

export interface ColumnCustomNodeAttrProps {
  sequence: AnalysisResult
  attrKey: string
}

export function ColumnCustomNodeAttr({ sequence, attrKey }: ColumnCustomNodeAttrProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { id, attrValue, secondaryValues } = useMemo(() => {
    const { index, seqName, customNodeAttributes } = sequence
    const attr = get(customNodeAttributes, attrKey, undefined)

    const secondaryValues = values(attr?.secondaryValues ?? {}).map(({ key, value }) => (
      <tr key={key}>
        <td>{key}</td>
        <td>{value}</td>
      </tr>
    ))

    const id = getSafeId('col-custom-attr', { index, seqName, attrKey })

    return { id, attrValue: attr?.value, secondaryValues }
  }, [attrKey, sequence])

  return (
    <>
      <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {attrValue}
      </div>
      <Tooltip isOpen={secondaryValues.length > 0 && showTooltip} target={id} wide fullWidth>
        <Table borderless>{secondaryValues}</Table>
      </Tooltip>
    </>
  )
}
