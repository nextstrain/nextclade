import React, { useCallback, useMemo } from 'react'
import { Form, FormGroup, Label } from 'reactstrap'
import { useRecoilState } from 'recoil'
import { Multitoggle } from 'src/components/Common/Multitoggle'
import { Toggle } from 'src/components/Common/Toggle'
import { CLADE_COLOR_STYLES, type CladeColorStyle, parseCladeColorStyle } from 'src/components/Results/cladeColor'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import {
  cladeColorStyleAtom,
  shouldZoomTreeToCladeAtom,
  shouldZoomTreeToSequenceAtom,
} from 'src/state/settings.state'

export function TreeSettings() {
  const { t } = useTranslationSafe()
  const [shouldZoomTreeToSequence, setShouldZoomTreeToSequence] = useRecoilState(shouldZoomTreeToSequenceAtom)
  const [cladeColorStyle, setCladeColorStyle] = useRecoilState(cladeColorStyleAtom)
  const [shouldZoomTreeToClade, setShouldZoomTreeToClade] = useRecoilState(shouldZoomTreeToCladeAtom)

  const cladeColorStyleLabels: Record<CladeColorStyle, string> = useMemo(
    () => ({
      circle: t('circle'),
      badge: t('badge'),
      none: t('none'),
    }),
    [t],
  )

  const onCladeColorStyleChange = useCallback(
    (name: string) => {
      const style = parseCladeColorStyle(name)
      if (style) {
        setCladeColorStyle(style)
      }
    },
    [setCladeColorStyle],
  )

  return (
    <Form>
      <FormGroup className="mt-3">
        <Toggle
          identifier="toggle-zoom-tree-to-sequence"
          checked={shouldZoomTreeToSequence}
          onCheckedChanged={setShouldZoomTreeToSequence}
        >
          <span
            title={t(
              'When on, the tree button next to a sequence name in the results table zooms the tree to the selected sequences. When off, the tree keeps its zoom. Alt+click on the button does the opposite.',
            )}
          >
            {t('Zoom the tree to the sequences shown with the tree buttons of the results table')}
          </span>
        </Toggle>
      </FormGroup>

      <FormGroup>
        <Label
          className="pointer-events-none"
          title={t(
            'How the results table shows the color of each clade and each clade-like value, such as a Pango lineage, on the tree: as a circle before the value, as a pale badge with a border in the color, or not at all. A click on the circle or on the badge shows the value on the tree.',
          )}
        >
          {t('Tree colors of clades in the results table')}
          <Multitoggle
            values={CLADE_COLOR_STYLES}
            labels={cladeColorStyleLabels}
            currentValue={cladeColorStyle}
            onChange={onCladeColorStyleChange}
          />
        </Label>
      </FormGroup>

      <FormGroup>
        <Toggle
          identifier="toggle-zoom-tree-to-clade"
          checked={shouldZoomTreeToClade}
          disabled={cladeColorStyle === 'none'}
          onCheckedChanged={setShouldZoomTreeToClade}
        >
          <span
            title={t(
              'When on, the circle or the badge of a clade or a clade-like value in the results table zooms the tree to the filtered sequences. When off, the tree keeps its zoom. Alt+click on it does the opposite.',
            )}
          >
            {t('Zoom the tree to the clades shown from the results table')}
          </span>
        </Toggle>
      </FormGroup>
    </Form>
  )
}
