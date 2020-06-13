import React from 'react'

export function Result({ result }: any) {
  if (!result) {
    return null
  }

  const items = result.map(({ seqName, clades }) => (
    <li key={seqName}>
      {seqName}
      <ResultOne seqName={seqName} clades={clades} />
    </li>
  ))
  return <ul>{items}</ul>
}

export function ResultOne({ seqName, clades }: any) {
  const items = Object.entries(clades).map(([key, values]) => (
    <li key={key}>
      {key}
      <ResultTwo values={values} />
    </li>
  ))
  return <ul>{items}</ul>
}

export function ResultTwo({ values }: any) {
  const items = values.map(({ pos, allele }) => <li key={pos}>{`pos: ${pos}, allele: ${allele}`}</li>)
  return <ul>{items}</ul>
}
