declare module 'auspice/src/reducers/metadata' {
  import { AuspiceMetadataState } from 'auspice'

  declare function metadata(state?: AuspiceMetadataState): AuspiceMetadataState | undefined
  export default metadata
}
