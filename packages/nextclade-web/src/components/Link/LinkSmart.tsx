import React, { useMemo } from 'react'
import isAbsoluteUrl from 'is-absolute-url'
import { LinkExternal, LinkExternalProps } from './LinkExternal'
import Link from 'next/link'

export function LinkSmart({ href, ...restProps }: LinkExternalProps) {
  const external = useMemo(() => isAbsoluteUrl(href ?? ''), [href])

  if (!href) {
    return <span {...restProps} />
  }

  if (external) {
    return <LinkExternal href={href} {...restProps} />
  }

  return <Link href={href} {...restProps} />
}
