import type { AuspiceState } from 'auspice'
import { isNil } from 'lodash'
import { getBrighterColorHex } from 'auspice/src/util/colorHelpers'
import { calcColorScale } from 'auspice/src/util/colorScale'
import { isValueValid } from 'auspice/src/util/globals'
import type { CladeColorScale } from 'src/components/Results/cladeColor'

/**
 * Return a color scale for each attribute of `attrKeys` that the tree offers as a coloring. The color of a value is the
 * color of the tips with this value when the user colors the tree by the attribute. The scales come from the Auspice
 * store of the tree, so they follow colors that the user edits on the tree page and the values of a second tree
 */
export function getCladeColorScales(
  state: AuspiceState,
  attrKeys: readonly string[],
): ReadonlyMap<string, CladeColorScale> {
  const { controls, tree, treeToo, metadata } = state
  if (isNil(controls) || isNil(tree?.nodes) || isNil(metadata)) {
    return new Map()
  }
  return new Map(
    attrKeys
      .filter((attrKey) => Object.hasOwn(metadata.colorings, attrKey))
      .map((attrKey) => {
        const { scale } = calcColorScale(attrKey, controls, tree, treeToo, metadata)
        const colorOf: CladeColorScale = (value) => {
          // The tree treats a value that Auspice does not consider valid, such as "unknown", as a missing value
          const isKnown = isValueValid(value)
          const stroke = scale(isKnown ? value : undefined)
          return { stroke, fill: getBrighterColorHex(stroke), isKnown }
        }
        return [attrKey, colorOf] as const
      }),
  )
}
