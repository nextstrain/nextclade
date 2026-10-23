declare module 'auspice/src/components/map/map' {
  import type { FC } from 'react'

  export interface AuspiceMapProps {
    width: number
    height: number
    /** Whether the map is drawn anew for a new dataset */
    justGotNewDatasetRenderNewMap: boolean
    /** Sections of the map legend: the colors of the coloring and the sizes of the circles */
    legend: { swatches: boolean; demes: boolean }
  }

  /** Map of the samples at the locations of the geographic resolution */
  const AuspiceMap: FC<AuspiceMapProps>
  export default AuspiceMap
}
