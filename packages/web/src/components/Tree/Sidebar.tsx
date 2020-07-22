import React from 'react'
import styled from 'styled-components'

import AuspiceControls from 'auspice/src/components/controls/controls'

export const StyledAuspiceControls = styled(AuspiceControls)`
  width: 100%;
  height: 100%;
  overflow-y: scroll;
`

export function Sidebar() {
  return <StyledAuspiceControls mapOn={false} frequenciesOn={false} />
}
