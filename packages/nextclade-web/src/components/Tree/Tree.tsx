import React from 'react'
import styled from 'styled-components'
import AutoSizer, { Size } from 'react-virtualized-auto-sizer'
import AuspiceEntropy from 'auspice/src/components/entropy'
import AuspiceTree from 'auspice/src/components/tree'

// HACK: For some reason, auspice tree requests space larger than the width and height passed into it.
//  So we pretend the container is smaller, by multiplying by this numbers.
//  This has to be fixed upstream.
const TREE_SIZE_HACK_WIDTH = 0.95
const TREE_SIZE_HACK_HEIGHT = 0.9

const ENTROPY_ASPECT_RATIO = 16 / 5

export const AuspiceEntropyContainer = styled.div`
  // prevent selection when dragging

  * {
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -o-user-select: none;
    user-select: none;
  }
`

export const AuspiceTreeStyled = styled(AuspiceTree)`
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
`

export function Tree() {
  return (
    <AutoSizer>
      {({ width, height }: Size) => {
        const fullWidth = width * TREE_SIZE_HACK_WIDTH
        const treeHeight = height * TREE_SIZE_HACK_HEIGHT
        const entropyHeight = width / ENTROPY_ASPECT_RATIO

        return (
          <>
            <AuspiceTreeStyled width={fullWidth} height={treeHeight} />
            <AuspiceEntropyContainer>
              <AuspiceEntropy width={fullWidth} height={entropyHeight} />
            </AuspiceEntropyContainer>
          </>
        )
      }}
    </AutoSizer>
  )
}
