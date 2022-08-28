declare module '*.svg' {
  import type { FC, SVGProps } from 'react'

  declare const ReactComponent: FC<SVGProps<SVGElement>>
  declare const url: string
  export { ReactComponent, url as default }
}
