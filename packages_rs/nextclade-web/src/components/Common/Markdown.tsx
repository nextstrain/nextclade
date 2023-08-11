import React, { Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import { LOADING } from 'src/components/Loading/Loading'

const REMARK_PLUGINS = [remarkGfm]

const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize]

const MD_COMPONENTS = {
  a: LinkExternal,
}

export interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS} components={MD_COMPONENTS}>
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
