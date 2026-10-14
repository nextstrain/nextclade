declare module 'auspice/src/actions/filesDropped/filesDropped' {
  import type { ThunkAction } from 'redux-thunk'
  import type { AnyAction } from 'redux'
  import type { AuspiceState } from 'auspice'

  /** Thunk: add the columns of metadata files (CSV, TSV, XLSX, node-data JSON) as colorings and filters */
  export default function handleFilesDropped(
    files: Iterable<File>,
  ): ThunkAction<Promise<void>, AuspiceState, unknown, AnyAction>
}

declare module 'auspice/src/actions/filesDropped/constants' {
  export function fileTypeIsCSVLike(file: File): boolean
  export function fileTypeIsJson(file: File): boolean
}
