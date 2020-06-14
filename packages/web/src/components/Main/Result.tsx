import React from 'react'

import type { AlgorithmResult, AnalyzeSeqResult, Clades } from 'src/algorithms/run'

export type ResultProps = AlgorithmResult

export function Result({ result }: ResultProps) {
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

export type ResultOneProps = AnalyzeSeqResult

export function ResultOne({ seqName, clades }: ResultOneProps) {
  const items = Object.entries(clades).map(([key, values]) => (
    <li key={key}>
      {key}
      <ResultTwo values={values} />
    </li>
  ))
  return <ul>{items}</ul>
}

export type ResultTwoProps = Clades

export function ResultTwo({ values }: ResultTwoProps) {
  const items = values.map(({ pos, allele }) => <li key={pos}>{`pos: ${pos}, allele: ${allele}`}</li>)
  return <ul>{items}</ul>
}
