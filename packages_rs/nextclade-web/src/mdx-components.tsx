import React from 'react'
import styled from 'styled-components'
import { TableSlim } from 'src/components/Common/TableSlim'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export const H1 = styled.h1`
  font-weight: bold;
  font-size: 1.55rem;
`

export const H2 = styled.h2`
  font-size: 1.33rem;
  font-weight: bold;

  margin-top: 1.25rem;
  margin-bottom: 0.75rem;

  :first-child {
    margin-top: 0;
  }

  border-radius: 5px;
`

export const H3 = styled.h3`
  font-size: 1.25rem;
  font-weight: bold;

  margin: 0 !important;
  margin-top: 1rem !important;

  code {
    font-size: 1.2rem;
    background-color: #eaeaea;
    border-radius: 5px;
    overflow-wrap: break-word;
    white-space: pre-wrap;

    @media (max-width: 992px) {
      font-size: 1.1rem;
    }
  }
`

export const H4 = styled.h4`
  font-size: 1.2rem;
  font-weight: bold;

  @media (max-width: 992px) {
    font-size: 1.2rem;
    margin-top: 1.2rem;
  }
`

export const H5 = styled.h5`
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 1.1rem;

  @media (max-width: 992px) {
    font-size: 1rem;
    margin-top: 1.1rem;
  }
`

export const H6 = styled.h6`
  font-size: 1rem;
  font-weight: bold;
`

export const Blockquote = styled.blockquote`
  border-radius: 3px;
  background-color: #f4ebbd;
`

export const P = styled.p`
  margin: 3px 7px;

  code {
    font-size: 0.8rem;
    padding: 1px 5px;
    background-color: #eaeaea;
    border-radius: 5px;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }
`

export const Pre = styled.pre`
  margin: 0.3rem 0.8rem;
  padding: 0.7rem 0.5rem;

  background-color: #eaeaea;
  border-radius: 5px;
  overflow: hidden;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.33rem;
  font-size: 0.8rem;
`

export const Code = styled.code`
  font-size: 0.8rem;
  padding: 1px 0;
  background-color: #eaeaea;
  border-radius: 5px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`

export const Li = styled.li`
  & > p {
    margin: 0;
    padding: 0;
  }
`

function Table({ ...restProps }) {
  return <TableSlim striped {...restProps} />
}

export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  p: P,
  a: LinkExternal,
  blockquote: Blockquote,
  li: Li,
  pre: Pre,
  code: Code,
  table: Table,
}
