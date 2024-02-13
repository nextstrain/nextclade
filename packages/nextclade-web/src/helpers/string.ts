/* eslint-disable no-plusplus,no-loops/no-loops */
import { sortBy } from 'lodash'

function getBigrams(s: string) {
  const bigrams = []
  const strLength = s.length
  for (let i = 0; i < strLength; i++) {
    bigrams.push(s.slice(i, 2))
  }
  return bigrams
}

export function sorensenDice(s1: string, s2: string) {
  const length1 = s1.length - 1
  const length2 = s2.length - 1
  if (length1 < 1 || length2 < 1) {
    return 0
  }

  let intersection = 0
  const bigrams1: (string | null)[] = getBigrams(s1)
  const bigrams2: (string | null)[] = getBigrams(s2)

  for (let i = 0; i < length1; i++) {
    for (let j = 0; j < length2; j++) {
      if (bigrams1[i] === bigrams2[j]) {
        intersection++
        bigrams2[j] = null
        break
      }
    }
  }

  return (2.0 * intersection) / (length1 + length2)
}

export function findSimilarStrings(haystack: string[], needle: string): string[] {
  let scores = haystack
    .map((candidate) => ({ candidate, score: sorensenDice(candidate, needle) }))
    .filter(({ score }) => score > 0.0)
  scores = sortBy(scores, ({ score }) => -score)
  return scores.map(({ candidate }) => candidate)
}

export function firstLetter(s: string): string | undefined {
  return s.split('').find((c) => c.toLowerCase().match(/[a-z]/))
}
