import React, { Suspense, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import { LOADING } from 'src/components/Loading/Loading'
import { mdxComponents } from 'src/mdx-components'

export interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  const remarkPlugins = useMemo(() => [remarkGfm], [])
  const rehypePlugins = useMemo(() => [rehypeRaw, rehypeSanitize], [])
  return (
    // @ts-expect-error -- type mismatch between react-markdown and plugins
    <ReactMarkdown rehypePlugins={rehypePlugins} remarkPlugins={remarkPlugins} components={mdxComponents}>
      {content}
    </ReactMarkdown>
  )
}

export interface MarkdownRemoteProps {
  url: string
}

function MarkdownRemoteImpl({ url }: MarkdownRemoteProps) {
  const content = useAxiosQuery<string>(url)
  return <Markdown content={content} />
}

export function MarkdownRemote({ url }: MarkdownRemoteProps) {
  return (
    <Suspense fallback={LOADING}>
      <MarkdownRemoteImpl url={url} />
    </Suspense>
  )
}
