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

  const clade = last(cladesArray) ?? CLADE_EMPTY
  const cladeList = cladesArray.join(CLADE_LIST_DELIMITER)
  return { clade, cladeList }
}
