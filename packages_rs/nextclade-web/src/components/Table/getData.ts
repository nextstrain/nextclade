import type { NextcladeResult } from 'src/types'
import DATA from '../../../../../data/data.json'

export function getData() {
  return DATA as unknown as NextcladeResult[]
}
