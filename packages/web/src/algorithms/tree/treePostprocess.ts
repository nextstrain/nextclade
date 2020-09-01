/* eslint-disable camelcase */
import type { AuspiceJsonV2 } from 'auspice'

import type { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/enums'
import { UNKNOWN_VALUE } from 'src/constants'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export interface AddColoringScaleParams {
  auspiceData: AuspiceJsonV2
  key: string
  value: string
  color: string
}

export function addColoringScale({ auspiceData, key, value, color }: AddColoringScaleParams) {
  const coloring = auspiceData?.meta?.colorings.find((coloring) => coloring.key === key)
  coloring?.scale?.unshift([UNKNOWN_VALUE, color])
}

export function remove_mutations(node: AuspiceTreeNodeExtended) {
  if (node?.mutations) {
    node.mutations = undefined
  }

  const children = node?.children ?? []
  for (const c of children) {
    remove_mutations(c)
  }
}

export function treePostProcess(auspiceData: AuspiceJsonV2) {
  const focal_node = auspiceData.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  remove_mutations(focal_node)

  if (!auspiceData.meta) {
    auspiceData.meta = { colorings: [], display_defaults: {} }
  }

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: 'QC Status',
    title: 'QC Status',
    type: 'categorical',
    scale: [
      [QCRuleStatus.good, '#417C52'],
      [QCRuleStatus.mediocre, '#cab44d'],
      [QCRuleStatus.bad, '#CA738E'],
    ],
  })

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: 'Node type',
    title: 'Node type',
    type: 'categorical',
    scale: [
      [NodeType.New, '#ff6961'],
      [NodeType.Reference, '#999999'],
    ],
  })

  // TODO: this can be done offline when preparing the json
  addColoringScale({ auspiceData, key: 'region', value: UNKNOWN_VALUE, color: '#999999' })
  addColoringScale({ auspiceData, key: 'country', value: UNKNOWN_VALUE, color: '#999999' })
  addColoringScale({ auspiceData, key: 'division', value: UNKNOWN_VALUE, color: '#999999' })

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.display_defaults = {
    branch_label: 'clade',
    color_by: 'Node type',
    distance_measure: 'div',
  }
  auspiceData.meta.panels = ['tree', 'entropy']
  auspiceData.meta.geo_resolutions = undefined

  return auspiceData
}
