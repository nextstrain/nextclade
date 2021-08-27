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

  & th {
    margin: 0;
    padding: 0 0.5rem;
  }
`

export const TableSlimWithBorders = styled(TableSlim)`
  & td {
    border: 1px solid #ccc;
  }

  & th {
    border: 1px solid #ccc;
  }
`
