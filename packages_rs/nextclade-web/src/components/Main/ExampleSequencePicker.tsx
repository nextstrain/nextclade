import React, { useCallback, useMemo } from 'react'
import { FormGroup as FormGroupBase, Label as LabelBase } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { Dropdown as DropdownBase } from 'src/components/Common/Dropdown'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'
import { datasetsAtom } from 'src/state/dataset.state'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import styled from 'styled-components'

export function ExampleSequencePicker() {
  const { t } = useTranslationSafe()
  const { datasets } = useRecoilValue(datasetsAtom)

  const { options, defaultOption } = useMemo(() => {
    const options = datasets.map(
      (dataset) => ({
        value: dataset.path,
        label: dataset.path,
      }),
      [],
    )
    return { options, defaultOption: options[0] }
  }, [datasets])

  const { addQryInputs } = useQuerySeqInputs()
  const onValueChange = useCallback(
    (path: string) => {
      const dataset = datasets.find((dataset) => dataset.path === path)
      if (dataset) {
        addQryInputs([new AlgorithmInputDefault(dataset)])
      }
    },
    [addQryInputs, datasets],
  )

  return (
    <FormGroup>
      <Label>
        <span>{t('Add example')}</span>

        <DropdownWrapper>
          <Dropdown
            identifier="example-sequence-picker"
            options={options}
            defaultOption={defaultOption}
            onValueChange={onValueChange}
          />
        </DropdownWrapper>
      </Label>
    </FormGroup>
  )
}

const FormGroup = styled(FormGroupBase)`
  margin: 0;
  width: 100%;
  max-width: 500px;
  margin-left: auto;
`

const Label = styled(LabelBase)`
  display: flex;
  flex: 0;

  & > span {
    margin: auto 0;
    margin-right: 1rem;
  }
`

const DropdownWrapper = styled.span`
  flex: 1;
`

const Dropdown = styled(DropdownBase)`
  & * {
    z-index: 100 !important;
  }
`
