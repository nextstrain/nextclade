import React, { HTMLProps, PropsWithChildren, useCallback } from 'react'
import styled from 'styled-components'
import { StrictOmit } from 'ts-essentials'
import { usePlausible } from 'src/components/Common/Plausible'

const A = styled.a`
  overflow-wrap: break-word;
  word-wrap: break-word;
  -ms-hyphens: auto;
  -moz-hyphens: auto;
  -webkit-hyphens: auto;
  hyphens: auto;
`

export interface LinkExternalProps extends StrictOmit<HTMLProps<HTMLAnchorElement>, 'as' | 'ref' | 'download'> {
  url?: string
  href?: string
  download?: boolean
}

export function LinkExternal({ url, href, children, download, ...restProps }: PropsWithChildren<LinkExternalProps>) {
  const plausible = usePlausible()
  const onLinkClicked = useCallback(
    () => plausible('Outbound link click', { props: { href: url ?? href } }),
    [href, plausible, url],
  )

  let target: string | undefined = '_blank'
  let rel: string | undefined = 'noopener noreferrer'
  if (download) {
    target = undefined
    rel = undefined
  }

  return (
    <A target={target} rel={rel} href={url ?? href} download={download} onClick={onLinkClicked} {...restProps}>
      {children}
    </A>
  )
}
