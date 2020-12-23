/* eslint-disable no-loops/no-loops,no-plusplus */
import { isMatch } from '../src/algorithms/nucleotideCodes'

const NUCS = ['U', 'T', 'A', 'W', 'C', 'Y', 'M', 'H', 'G', 'K', 'R', 'D', 'S', 'B', 'V', 'N', '-']
const N = NUCS.length
const indices = Array.from(Array(N).keys())

// Header (column names)
process.stdout.write(`  /*           ${indices.map((i) => i.toString(10).padStart(2, '0')).join('  ')} */\n`)
process.stdout.write(`  /*            ${NUCS.join('   ')} */\n`)

for (let i = 0; i < N; ++i) {
  const x = NUCS[i]

  // Row names
  process.stdout.write(`  /* ${i.toString(10).padStart(2, '0')}   ${x} */`)

  for (let j = 0; j < N; ++j) {
    const y = NUCS[j]

    if (isMatch(x, y)) {
      process.stdout.write('  1,')
    } else {
      process.stdout.write('  0,')
    }
  }

  process.stdout.write('\n')
}
