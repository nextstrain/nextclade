import React from 'react'
import { Td, Tr } from 'src/components/Table/TableStyles'

export function TableSpacer({ height }: { height: number }) {
  if (height <= 0) {
    return null
  }

  return (
    <Tr>
      <Td height={height} />
    </Tr>
  )
}
