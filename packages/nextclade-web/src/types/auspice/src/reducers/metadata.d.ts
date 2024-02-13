declare module 'auspice/src/reducers/metadata' {
  import { AuspiceMetadata } from 'auspice'

  declare function metadata(state?: AuspiceMetadata): AuspiceMetadata | undefined
  export default metadata
}
