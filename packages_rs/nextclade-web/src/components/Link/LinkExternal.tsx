import React, { HTMLProps, PropsWithChildren } from 'react'
import styled from 'styled-components'
import { StrictOmit } from 'ts-essentials'

const A = styled.a`
  overflow-wrap: break-word;
  word-wrap: break-word;
`

export interface LinkExternalProps extends StrictOmit<HTMLProps<HTMLAnchorElement>, 'as' | 'ref' | 'download'> {
  url?: string
  href?: string
  download?: boolean
}

export function LinkExternal({ url, href, children, download, ...restProps }: PropsWithChildren<LinkExternalProps>) {
  let target: string | undefined = '_blank'
  let rel: string | undefined = 'noopener noreferrer'
  if (download) {
    target = undefined
    rel = undefined
  }

  return (
    <A target={target} rel={rel} href={url ?? href} download={download} {...restProps}>
      {children}
    </A>
  )
}
