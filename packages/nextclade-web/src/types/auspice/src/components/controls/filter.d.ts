declare module 'auspice/src/components/controls/filter' {
  import type { FC, ReactElement } from 'react'

  export interface FilterDataProps {
    measurementsOn?: boolean
  }

  const FilterData: FC<FilterDataProps>
  export default FilterData

  export const FilterInfo: ReactElement
}
