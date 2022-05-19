import React, { memo } from 'react'

import { RectangularTree } from 'auspice/src/components/framework/svg-icons'

const theme = { unselectedColor: '#222' }

export function TreeIconRaw() {
  const size = 20
  return <RectangularTree theme={theme} width={size} />
}

export const TreeIcon = memo(TreeIconRaw)
