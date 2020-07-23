import React from 'react'

import AutoSizer from 'react-virtualized-auto-sizer'

import AuspiceTree from 'auspice/src/components/tree'

export function Tree() {
  return <AutoSizer>{({ width, height }) => <AuspiceTree width={width} height={height} />}</AutoSizer>
}
