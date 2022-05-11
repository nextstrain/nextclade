import type { AuspiceState } from 'auspice'
import { applyFilter } from 'auspice/src/actions/tree'

// NOTE: These actions are not FSA-compliant. This is the format Auspice expects.
//  Be careful when using in a FSA reducer or a saga!
export const auspiceStartClean = (state: AuspiceState) => ({ type: 'CLEAN_START', ...state })
export const treeFilterByNodeType = (nodeTypes: string[]) => applyFilter('add', 'Node type', nodeTypes)
export const treeFilterByClade = (clades: string[]) => applyFilter('add', 'clade_membership', clades)
export const treeFilterByQcStatus = (qsStatuses: string[]) => applyFilter('add', 'QC Status', qsStatuses)
