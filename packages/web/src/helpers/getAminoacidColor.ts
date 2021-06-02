import { get } from 'lodash'

import { Aminoacid } from 'src/algorithms/types'

// Borrowed from http://ugene.net/forum/YaBB.pl?num=1337064665
export const AMINOACID_COLORS: Record<string, string> = {
  'A': '#EAEABA',
  'V': '#EAEA9F',
  'L': '#E1E177',
  'I': '#C9C94D',
  'B': '#AAAAAA',
  'C': '#E3F9B0',
  'D': '#E98F6D',
  'E': '#F7B080',
  'F': '#C7C88D',
  'G': '#C0C0C0',
  'H': '#D6F6FA',
  'K': '#CEC0F3',
  'M': '#C3ED3C',
  'N': '#F29290',
  'P': '#D2D1F8',
  'Q': '#F8C4E3',
  'R': '#A6ACEF',
  'S': '#D8B9D4',
  'T': '#F0D6E3',
  'W': '#86B0CC',
  'X': '#AAAAAA',
  'Y': '#8FC7D1',
  'Z': '#AAAAAA',
  '*': '#AAAAAA',
  '-': '#AAAAAA',
}

export const AMINOACID_GAP_COLOR = AMINOACID_COLORS['-']

export function getAminoacidColor(aa: Aminoacid): string {
  return get(AMINOACID_COLORS, aa) ?? AMINOACID_COLORS['-']
}
