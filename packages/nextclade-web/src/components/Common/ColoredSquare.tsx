import styled from 'styled-components'

export const ColoredSquare = styled.span<{ size: string; color: string }>`
  width: ${(props) => props.size};
  height: ${(props) => props.size};
  background-color: ${(props) => props.color};
`
