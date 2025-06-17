import React, { HTMLAttributes, PropsWithChildren } from 'react'

import NextLink, { LinkProps as NextLinkProps } from 'next/link'

export interface LinkProps extends PropsWithChildren<NextLinkProps & HTMLAttributes<HTMLAnchorElement>> {
  className?: string
}

export function Link({ className, children, href, title, ...restProps }: LinkProps) {
  return (
    <NextLink {...restProps} className={className} title={title} href={href} passHref={false}>
      {children}
    </NextLink>
  )
}

export default Link
