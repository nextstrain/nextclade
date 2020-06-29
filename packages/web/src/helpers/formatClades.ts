import { Substitutions } from 'src/algorithms/types'
import { last } from 'lodash'

// eslint-disable-next-line only-ascii/only-ascii
const CLADE_LIST_DELIMITER = ' → '
const CLADE_EMPTY = '-'

export function formatClades(clades: Substitutions) {
  let cladesArray = Object.keys(clades)
  if (cladesArray.length === 0) {
    cladesArray = [CLADE_EMPTY]
  }

  const cladeStr = last(cladesArray) ?? CLADE_EMPTY
  let cladeListStr = cladesArray.join(CLADE_LIST_DELIMITER)
  if (cladeStr === cladeListStr) {
    return { cladeStr, cladeListStr }
  }

  cladeListStr = `${cladeStr} (${cladeListStr})`
  return { cladeStr, cladeListStr }
}
