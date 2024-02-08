import React from 'react'

export function truncateList(list: JSX.Element[], maxLength: number, text: string) {
  let result = list
  if (list.length > maxLength) {
    result = result.slice(0, maxLength)
    result.push(<li key={text}>{text}</li>)
  }
  return result
}
