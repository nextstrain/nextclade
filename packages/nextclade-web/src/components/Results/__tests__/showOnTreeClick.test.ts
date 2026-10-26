import { showOnTreeParamsFromClick } from 'src/components/Results/showOnTreeClick'

const CLICK = { shiftKey: false, altKey: false }
const SHIFT = { shiftKey: true, altKey: false }
const ALT = { shiftKey: false, altKey: true }
const BOTH = { shiftKey: true, altKey: true }

describe('show on tree click', () => {
  // Expected values from the requested behavior: Shift+click adds to the selection, Alt+click inverts the zoom setting
  test.each([
    { name: 'click, zoom off', modifiers: CLICK, shouldZoom: false, expected: { addToSelection: false, zoom: false } },
    { name: 'click, zoom on', modifiers: CLICK, shouldZoom: true, expected: { addToSelection: false, zoom: true } },
    { name: 'Shift+click', modifiers: SHIFT, shouldZoom: false, expected: { addToSelection: true, zoom: false } },
    { name: 'Alt+click, zoom off', modifiers: ALT, shouldZoom: false, expected: { addToSelection: false, zoom: true } },
    { name: 'Alt+click, zoom on', modifiers: ALT, shouldZoom: true, expected: { addToSelection: false, zoom: false } },
    { name: 'Shift+Alt+click', modifiers: BOTH, shouldZoom: true, expected: { addToSelection: true, zoom: false } },
  ])('$name', ({ modifiers, shouldZoom, expected }) => {
    expect(showOnTreeParamsFromClick(modifiers, shouldZoom)).toStrictEqual(expected)
  })
})
