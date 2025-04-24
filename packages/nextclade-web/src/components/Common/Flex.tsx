import styled from 'styled-components'

export const FlexContainer = styled.div`
  display: flex;
  flex: 1;
  margin: 0;
`

export const FlexLeft = styled.div`
  flex: 0;
  display: flex;
  flex-direction: column;
  margin: auto 0;
`

export const FlexRight = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  width: 0;
`
