import { Table as ReactstrapTable } from 'reactstrap'
import styled from 'styled-components'

export const TableSlim = styled(ReactstrapTable)`
  & td {
    padding: 0 0.5rem;
  }

  & tr {
    margin: 0;
    padding: 0;
  }
`
