import { ErrorInternal } from 'src/helpers/ErrorInternal'

export function unreachable(impossible: never): never {
  throw new ErrorInternal(`Reached impossible state: '${impossible}'`)
}
