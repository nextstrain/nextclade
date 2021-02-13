import React, { PropsWithChildren } from 'react'

export interface LinkExternalProps extends React.HTMLProps<HTMLAnchorElement> {
  url?: string
  href?: string
}

export function LinkExternal({ url, href, children, download, ...restProps }: PropsWithChildren<LinkExternalProps>) {
  let target: string | undefined = '_blank'
  let rel: string | undefined = 'noopener noreferrer'
  if (download) {
    target = undefined
    rel = undefined
  }

  return (
    <a target={target} rel={rel} href={url ?? href} {...restProps}>
      {children}
    </a>
  )
}
