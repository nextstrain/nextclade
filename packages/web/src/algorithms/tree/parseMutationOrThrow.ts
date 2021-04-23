import { parseMutation } from 'src/helpers/parseMutation'

export function parseMutationOrThrow(mut: string) {
  const parsedMut = parseMutation(mut)
  if (!parsedMut) {
    throw new Error(`Mutation cannot be parsed: "${mut}"`)
  }

  const { refNuc, pos, queryNuc } = parsedMut
  if (!refNuc || pos === undefined || !queryNuc) {
    throw new Error(`Mutation cannot be parsed: "${mut}"`)
  }

  return { refNuc, pos, queryNuc }
}
