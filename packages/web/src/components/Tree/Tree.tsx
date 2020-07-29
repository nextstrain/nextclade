import React from 'react'

import styled from 'styled-components'
import AutoSizer from 'react-virtualized-auto-sizer'

import AuspiceTree from 'auspice/src/components/tree'
import AuspiceEntropy from 'auspice/src/components/entropy'

// HACK: For some reason, auspice tree requests space larger than the width and height passed into it.
//  So we pretend the container is smaller, by multiplying by this numbers.
//  This has to be fixed upstream.
const TREE_SIZE_HACK_WIDTH = 0.98
const TREE_SIZE_HACK_HEIGHT = 0.96

const ENTROPY_HEIGHT = 0.25

export const AuspiceTreeStyled = styled(AuspiceTree)`
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
`

export function Tree() {
  return (
    <AutoSizer>
      {({ width, height }) => {
        const fullWidth = width * TREE_SIZE_HACK_WIDTH
        const fullHeight = height * TREE_SIZE_HACK_HEIGHT

        return (
          <>
            <AuspiceTreeStyled width={fullWidth} height={fullHeight * (1 - ENTROPY_HEIGHT)} />
            <AuspiceEntropy width={fullWidth} height={ENTROPY_HEIGHT} />
          </>
        )
      }}
    </AutoSizer>
  )
}
