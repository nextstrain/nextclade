import type { Constellation } from 'src/algorithms/types'
import { sanitizeError } from 'src/helpers/sanitizeError'

export function convertConstellationDefinitionObjects(constellationsSpec: Object[]): Constellation[] {
  const itemsNotConstellation = []
  const constellations = constellationsSpec as Constellation[]
  constellations.forEach(function f(item) {
    if (
      !Object.prototype.hasOwnProperty.call(item, 'description') ||
      !Object.prototype.hasOwnProperty.call(item, 'url') ||
      !Object.prototype.hasOwnProperty.call(item, 'substitutions') ||
      !Object.prototype.hasOwnProperty.call(item, 'deletions')
    ) {
      itemsNotConstellation.push(item)
    }
    /* TODO: deep check of substitution fields */
    /* Massage the input data codon position down one, because internally NextClade uses zero-based codoin numbering :-P */
    item.substitutions.forEach(function s(aaSub) {
      aaSub.codon -= 1
    })
  })
  if (itemsNotConstellation.length > 0) {
    const len = itemsNotConstellation.length
    throw new Error(`Variant constellation data array contains non-constellation object(s): ${len}`)
  }
  return constellations
}

export function convertConstellationDefinitions(content: string): Constellation[] {
  if (!content) {
    return []
  }
  let constellations
  try {
    constellations = JSON.parse(content) as Constellation[]
  } catch (error_: unknown) {
    const error = sanitizeError(error_)
    throw new Error(`Variant constellation data format not recognized. JSON parsing error: ${error.message}`)
  }
  if (constellations.length === 0) {
    throw new Error(
      `Variant constellation data is a JSON formatted array, but is empty. The expected way to provide no variant constellation input is a blank file`,
    )
  }

  return convertConstellationDefinitionObjects(constellations)
}
