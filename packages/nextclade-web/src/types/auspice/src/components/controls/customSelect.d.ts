declare module 'auspice/src/components/controls/customSelect' {
  import type { GroupBase, Props } from 'react-select'

  /** Select of the Auspice sidebar: `react-select` with Auspice's dropdown indicator and styles */
  export default function CustomSelect<
    Option,
    IsMulti extends boolean = false,
    Group extends GroupBase<Option> = GroupBase<Option>,
  >(props: Props<Option, IsMulti, Group>): JSX.Element
}
