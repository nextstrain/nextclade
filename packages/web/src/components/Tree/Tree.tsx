import React from 'react'

import styled from 'styled-components'
import AutoSizer from 'react-virtualized-auto-sizer'

import AuspiceTree from 'auspice/src/components/tree'

// HACK: For some reason, auspice tree requests space larger than the width and height passed into it.
//  So we pretend the container is smaller, by multiplying by this numbers.
//  This has to be fixed upstream.
const TREE_SIZE_HACK_WIDTH = 0.98
const TREE_SIZE_HACK_HEIGHT = 0.96

export const AuspiceTreeStyled = styled(AuspiceTree)`
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
`

export function Tree() {
  return (
    <AutoSizer>
      {({ width, height }) => (
        <AuspiceTreeStyled width={width * TREE_SIZE_HACK_WIDTH} height={height * TREE_SIZE_HACK_HEIGHT} />
      )}
    </AutoSizer>
  )
}
