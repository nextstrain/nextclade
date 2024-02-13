import React, { useMemo } from 'react'

export function FormattedText({ text }: { text: string }) {
  const paragraphs = useMemo(() => text.split('\n').map((line) => <p key={line}>{line}</p>), [text])
  return <section>{paragraphs}</section>
}
