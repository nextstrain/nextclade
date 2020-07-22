import React from 'react'

import styled from 'styled-components'

import Controls from 'auspice/src/components/controls/controls'
import Tree from 'auspice/src/components/tree'

const AuspiceContainer = styled.div`
  display: flex;
`

const SidebarContainer = styled.div`
  flex: 0;
`

const TreeContainer = styled.div`
  flex: 1;
`

function TreePage() {
  return (
    <AuspiceContainer>
      <SidebarContainer>
        <Controls mapOn={false} frequenciesOn={false} />
      </SidebarContainer>
      <TreeContainer>
        <Tree width={800} height={600} />
      </TreeContainer>
    </AuspiceContainer>
  )
}

export default TreePage
