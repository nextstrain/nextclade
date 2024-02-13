import { zip } from 'lodash'

export function safeZip<T, U>(first: T[], second: U[]) {
  const firstLen = first.length
  const secondLen = second.length
  if (first.length !== second.length) {
    throw new Error(
      `safeZip: expected zipped arrays to be of equal length, but got arrays of lengths ${firstLen} and ${secondLen}`,
    )
  }

  return zip(first, second) as [T, U][]
}

export function safeZip3<T, U, V>(first: T[], second: U[], third: V[]) {
  const firstLen = first.length
  const secondLen = second.length
  const thirdLen = third.length
  if (first.length !== second.length || second.length !== third.length) {
    throw new Error(
      `safeZip: expected zipped arrays to be of equal length, but got arrays of lengths ${firstLen}, ${secondLen}, ${thirdLen}`,
    )
  }

  return zip(first, second, third) as [T, U, V][]
}
