import styled from 'styled-components'

export const SequenceViewWrapper = styled.div`
  display: flex;
  width: 100%;
  height: 30px;
  vertical-align: middle;
  margin: 0;
  padding: 0;
`

export const SequenceViewSVG = styled.svg`
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
`

export const SequenceViewCoverageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`

export const SequenceViewCoverageText = styled.p`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  margin: 0;
  padding: 0 2px;
  display: flex;
  align-items: center;
  pointer-events: none;
`
