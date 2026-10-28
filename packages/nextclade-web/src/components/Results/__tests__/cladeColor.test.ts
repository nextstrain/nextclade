import { uniq } from 'lodash'
import { getContrast, rgb } from 'polished'
import { colors as auspicePalettes } from 'auspice/src/util/globals'
import { CLADE_BADGE_TEXT_COLOR, getCladeBadgeBackground } from 'src/components/Results/cladeColor'

// Contrast of normal text that WCAG 2 level AA requires
const WCAG_AA_TEXT_CONTRAST = 4.5

// Greys of the tree: the color of unknown values, and the ends of the range for values without a dataset color
// (`unknownColor` and `getExtraVals` in Auspice `src/util/colorScale.ts`)
const AUSPICE_GREYS = ['#ADB1B3', '#BDC3C6', '#868992']

// Datasets can set any color, so the badge must work for colors from all over the RGB cube, down to black
const CHANNEL_STEPS = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff]
const RGB_GRID = CHANNEL_STEPS.flatMap((red) =>
  CHANNEL_STEPS.flatMap((green) => CHANNEL_STEPS.map((blue) => rgb(red, green, blue))),
)

const TREE_COLORS = uniq([...auspicePalettes.flat(), ...AUSPICE_GREYS, ...RGB_GRID])

describe('clade badge', () => {
  test.each(TREE_COLORS)('keeps the text legible on the badge of tree color %s', (stroke) => {
    const background = getCladeBadgeBackground({ stroke, fill: stroke, isKnown: true })
    expect(getContrast(CLADE_BADGE_TEXT_COLOR, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST)
  })
})
