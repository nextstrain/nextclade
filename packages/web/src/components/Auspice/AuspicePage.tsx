import React, { useEffect, useState } from 'react'

import { connect } from 'react-redux'
import { Button } from 'reactstrap'
import styled from 'styled-components'

import Controls from 'auspice/src/components/controls/controls'
import Tree from 'auspice/src/components/tree'
import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import { State } from 'state/reducer'

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

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = (dispatch) => ({
  startClean: (state) => dispatch({ type: 'CLEAN_START', ...state }),
})

const AuspicePage = connect(mapStateToProps, mapDispatchToProps)(AuspicePageDisconnected)

export default AuspicePage

function AuspicePageDisconnected({ startClean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const state = createStateFromQueryOrJSONs({ json, query: {} })
    startClean(state)
  }, [startClean])

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
