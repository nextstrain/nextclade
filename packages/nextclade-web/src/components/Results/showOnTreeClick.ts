import type { ShowOnTreeParams } from 'src/state/auspice/auspice.actions'

/** Modifier keys held during a click */
export interface ClickModifiers {
  shiftKey: boolean
  altKey: boolean
}

/**
 * Return how a click on "show on tree" changes the tree: Shift+click adds the sequence to the selected sequences
 * instead of selecting it alone, and Alt+click does the opposite of the zoom setting
 */
export function showOnTreeParamsFromClick({ shiftKey, altKey }: ClickModifiers, shouldZoom: boolean): ShowOnTreeParams {
  return { addToSelection: shiftKey, zoom: shouldZoom !== altKey }
}
