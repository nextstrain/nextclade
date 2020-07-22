import React, { useEffect, useState } from 'react'

import { connect } from 'react-redux'
import { Button } from 'reactstrap'
import styled from 'styled-components'

import Controls from 'auspice/src/components/controls/controls'
import Tree from 'auspice/src/components/tree'
import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import type { AuspiceState } from 'src/state/auspice/auspice.state'
import { auspiceStartClean } from 'src/state/auspice/auspice.actions'
import { State } from 'src/state/reducer'

import json from '../../../out.json'

const AuspiceContainer = styled.div`
  display: flex;
`

const SidebarContainer = styled.div`
  flex: 0;
`

const TreeContainer = styled.div`
  flex: 1;
`

export interface TreePageProps {
  auspiceStartClean(state: AuspiceState): void
}

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  auspiceStartClean,
}

const TreePage = connect(mapStateToProps, mapDispatchToProps)(TreePageDisconnected)

function TreePageDisconnected({ auspiceStartClean }: TreePageProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const state = createStateFromQueryOrJSONs({ json, query: {} })
    auspiceStartClean(state)
  }, [auspiceStartClean])

  return (
    <>
      <Button onClick={() => setShow(true)}>{'Show tree'}</Button>
      {show && (
        <AuspiceContainer>
          <SidebarContainer>
            <Controls mapOn={false} frequenciesOn={false} />
          </SidebarContainer>
          <TreeContainer>
            <Tree width={800} height={600} />
          </TreeContainer>
        </AuspiceContainer>
      )}
    </>
  )
}

export default TreePage
