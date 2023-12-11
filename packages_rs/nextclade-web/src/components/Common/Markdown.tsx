import React, { Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import { LOADING } from 'src/components/Loading/Loading'
import { mdxComponents } from 'src/mdx-components'

const REMARK_PLUGINS = [remarkGfm]

const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize]

export interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS} components={mdxComponents}>
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
