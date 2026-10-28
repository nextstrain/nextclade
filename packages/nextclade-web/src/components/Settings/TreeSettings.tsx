import React from 'react'
import { Form, FormGroup } from 'reactstrap'
import { useRecoilState } from 'recoil'
import { Toggle } from 'src/components/Common/Toggle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { shouldZoomTreeToCladeAtom, shouldZoomTreeToSequenceAtom } from 'src/state/settings.state'

export function TreeSettings() {
  const { t } = useTranslationSafe()
  const [shouldZoomTreeToSequence, setShouldZoomTreeToSequence] = useRecoilState(shouldZoomTreeToSequenceAtom)
  const [shouldZoomTreeToClade, setShouldZoomTreeToClade] = useRecoilState(shouldZoomTreeToCladeAtom)

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
        <Toggle
          identifier="toggle-zoom-tree-to-clade"
          checked={shouldZoomTreeToClade}
          onCheckedChanged={setShouldZoomTreeToClade}
        >
          <span
            title={t(
              'When on, the circle before a clade or a clade-like value in the results table zooms the tree to the filtered sequences. When off, the tree keeps its zoom. Alt+click on the circle does the opposite.',
            )}
          >
            {t('Zoom the tree to the clades shown with the circles of the results table')}
          </span>
        </Toggle>
      </FormGroup>
    </Form>
  )
}
