import { get } from 'lodash'

import { Aminoacid } from 'src/types'

// Borrowed from http://ugene.net/forum/YaBB.pl?num=1337064665
export const AMINOACID_COLORS: Record<string, string> = {
  'A': '#e5e575',
  'V': '#e5e57c',
  'L': '#e5e550',
  'I': '#e5e514',
  'B': '#e54c4c',
  'C': '#cee599',
  'D': '#e5774e',
  'E': '#e59c6c',
  'F': '#e2e54d',
  'G': '#e57474',
  'H': '#9ddde5',
  'K': '#b4a2e5',
  'M': '#b7e525',
  'N': '#e57875',
  'P': '#b6b5e5',
  'Q': '#e5aacd',
  'R': '#878fe5',
  'S': '#e583d8',
  'T': '#e5b3cc',
  'W': '#4aa7e5',
  'X': '#aaaaaa',
  'Y': '#57cfe5',
  'Z': '#777777',
  '*': '#777777',
  '-': '#444444',
}

export const AMINOACID_GAP_COLOR = AMINOACID_COLORS['-']

export function getAminoacidColor(aa: Aminoacid): string {
  return get(AMINOACID_COLORS, aa) ?? AMINOACID_COLORS['-']
}
