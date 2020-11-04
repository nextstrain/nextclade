import React, { memo } from 'react'

import { RectangularTree } from 'auspice/src/components/framework/svg-icons'

export function TreeIconRaw() {
  const size = 20
  const theme = { unselectedColor: '#222' }
  return <RectangularTree theme={theme} width={size} />
}

export const TreeIcon = memo(TreeIconRaw)
