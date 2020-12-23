/* eslint-disable no-loops/no-loops,no-plusplus */
import { get } from 'lodash'
import { intersection } from '../src/helpers/setOperations'

const AAS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'Y',
  'Z',
  'X',
  '*',
  '-',
]

const ambiguities: Record<string, Set<string>> = {
  B: new Set(['D', 'N']),
  J: new Set(['L', 'I']),
  Z: new Set(['E', 'Q']),
}

export function getScore(query: string, reference: string): number {
  // simple match or ambiguous
  if (query === reference || query === 'X' || reference === 'X') {
    return 1
  }

  // match ambiguity code in query
  if (ambiguities[query] && ambiguities[query].has(reference)) {
    return 1
  }

  // match ambiguity code in reference
  if (ambiguities[reference] && ambiguities[reference].has(query)) {
    return 1
  }

  // if none of the previous matched, match generic ambiguity
  const queryNucs = get(ambiguities, query)
  const refNucs = get(ambiguities, reference)
  if (queryNucs && refNucs) {
    return intersection(queryNucs, refNucs).size
  }

  return 0
}

const N = AAS.length
const indices = Array.from(Array(N).keys())

// Header (column names)
process.stdout.write(`  /*           ${indices.map((i) => i.toString(10).padStart(2, '0')).join('  ')} */\n`)
process.stdout.write(`  /*            ${AAS.join('   ')} */\n`)

for (let i = 0; i < N; ++i) {
  const x = AAS[i]

  // Row names
  process.stdout.write(`  /* ${i.toString(10).padStart(2, '0')}   ${x} */`)

  for (let j = 0; j < N; ++j) {
    const y = AAS[j]
    const score = getScore(x, y)
    process.stdout.write(` ${score.toString(10).padStart(2, ' ')},`)
  }

  process.stdout.write('\n')
}
