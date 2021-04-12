/* eslint-disable camelcase */
import { get, set, unset } from 'lodash'
import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import type { AuspiceJsonV2Extended, AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/enums'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'
import { UNKNOWN_VALUE } from 'src/constants'

const HAS_PCR_PRIMER_CHANGES = 'Has PCR primer changes'
const NODE_TYPE = 'Node type'
const QC_STATUS = 'QC Status'

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

export function remove_mutations(nodeExtended: AuspiceTreeNodeExtended): AuspiceTreeNode {
  unset(nodeExtended, 'id')
  unset(nodeExtended, 'mutations')
  unset(nodeExtended, 'substitutions')

  const children = nodeExtended?.children ?? []
  for (const child of children) {
    remove_mutations(child)
  }

  return nodeExtended
}

export function treePostProcess(auspiceData: AuspiceJsonV2Extended): AuspiceJsonV2 {
  const focal_node = auspiceData.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  const tree = remove_mutations(focal_node)

  if (!auspiceData.meta) {
    auspiceData.meta = { colorings: [], display_defaults: {} }
  }

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: HAS_PCR_PRIMER_CHANGES,
    title: HAS_PCR_PRIMER_CHANGES,
    type: 'categorical',
    scale: [
      ['Yes', '#6961ff'],
      ['No', '#999999'],
    ],
  })

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: QC_STATUS,
    title: QC_STATUS,
    type: 'categorical',
    scale: [
      [QCRuleStatus.good, '#417C52'],
      [QCRuleStatus.mediocre, '#cab44d'],
      [QCRuleStatus.bad, '#CA738E'],
    ],
  })

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: NODE_TYPE,
    title: NODE_TYPE,
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
    color_by: 'clade_membership',
    distance_measure: 'div',
  }
  auspiceData.meta.panels = ['tree', 'entropy']
  auspiceData.meta.geo_resolutions = undefined

  const defaultFilters = get(auspiceData, 'meta.filters', []) as string[]
  set(auspiceData, 'meta.filters', [
    ...defaultFilters,
    'clade_membership',
    NODE_TYPE,
    QC_STATUS,
    HAS_PCR_PRIMER_CHANGES,
  ])

  return { ...auspiceData, tree }
}
