import React from 'react'

import { MDXProvider } from '@mdx-js/react'
import AboutContent from './AboutContent.mdx'

function P(props: React.HTMLProps<HTMLParagraphElement>) {
  return <p className="about-p" {...props} />
}

function H2(props: React.HTMLProps<HTMLHeadingElement>) {
  // eslint-disable-next-line jsx-a11y/heading-has-content
  return <h2 className="about-h2" {...props} />
}

function H3(props: React.HTMLProps<HTMLHeadingElement>) {
  // eslint-disable-next-line jsx-a11y/heading-has-content
  return <h3 className="about-h3" {...props} />
}

export function About() {
  return (
    <MDXProvider components={{ p: P, h2: H2, h3: H3 }}>
      <AboutContent />
    </MDXProvider>
  )
}
