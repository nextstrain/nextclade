declare module 'auspice/src/components/controls/filter' {
  import { FC } from 'react'

  export interface FilterDataProps {
    measurementsOn?: boolean
  }

  const FilterData: FC<FilterDataProps>
  export default FilterData
}
