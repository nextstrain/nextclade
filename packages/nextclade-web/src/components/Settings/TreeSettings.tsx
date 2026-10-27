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
              'When on, the tree button next to a sequence name and the circle before a clade in the results table zoom the tree to the shown sequences. When off, the tree keeps its zoom. Alt+click on them does the opposite.',
            )}
          >
            {t('Zoom the tree to the sequences shown from the results table')}
          </span>
        </Toggle>
      </FormGroup>
    </Form>
  )
}
