import React from 'react'
import { Form, FormGroup } from 'reactstrap'
import { useRecoilState } from 'recoil'
import { Toggle } from 'src/components/Common/Toggle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { shouldZoomTreeToSequenceAtom } from 'src/state/settings.state'

export function TreeSettings() {
  const { t } = useTranslationSafe()
  const [shouldZoomTreeToSequence, setShouldZoomTreeToSequence] = useRecoilState(shouldZoomTreeToSequenceAtom)

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
            {t('Zoom the tree to the sequences shown from the results table')}
          </span>
        </Toggle>
      </FormGroup>
    </Form>
  )
}
