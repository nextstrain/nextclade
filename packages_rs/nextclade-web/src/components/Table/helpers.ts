import { Column, ColumnDef } from '@tanstack/react-table'
import copy from 'fast-copy'
import { uniq } from 'lodash'

/** Reorder elemets of an array by index: src element is moved into slot before the dst element */
export function reorder<T>(arr: T[], srcIdx: number, dstIdx: number): T[] {
  arr.splice(dstIdx, 0, arr.splice(srcIdx, 1)[0])
  return copy(arr)
}

/** Reorder elemets of an array by value: src element is moved into slot before the dst element. Elements are assumed to be unique. */
export function reorderByValue<T>(arr: T[], srcVal: T, dstVal: T): T[] {
  return reorder(arr, arr.indexOf(srcVal), arr.indexOf(dstVal))
}

export function getColumnName<T, U>(col: Column<T, U>): string {
  return getColumnDefName(col.columnDef)
}

export function getColumnDefName<T, U>(columnDef: ColumnDef<T, U>): string {
  const name = columnDef.header?.toString() ?? columnDef.id
  if (!name) {
    throw new Error('Either `header` or `id` required for ColumnDef')
  }
  return name
}

export function hasDuplicates<T>(a: T[]) {
  return uniq(a).length !== a.length
}

export function getColumnDefNames<T, U>(columnDefs: ColumnDef<T, U>[]): string[] {
  const names = columnDefs.map((columnDef) => getColumnDefName(columnDef))
  if (hasDuplicates(names)) {
    throw new Error(`Column names are required to be unique but found: ${names.join(', ')}`)
  }
  return names
}
