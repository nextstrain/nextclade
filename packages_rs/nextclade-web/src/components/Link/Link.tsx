import React, { HTMLAttributes, PropsWithChildren } from 'react'

import NextLink, { LinkProps as NextLinkProps } from 'next/link'

export interface LinkProps extends PropsWithChildren<NextLinkProps & HTMLAttributes<HTMLAnchorElement>> {
  className?: string
}

export function Link({ className, children, href, title, ...restProps }: LinkProps) {
  return (
    <NextLink {...restProps} href={href} passHref={false}>
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a className={className} title={title}>
        {children}
      </a>
    </NextLink>
  )
}

export default Link
