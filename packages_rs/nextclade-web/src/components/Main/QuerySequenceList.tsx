import React, { useCallback, useMemo } from 'react'
import { Button } from 'reactstrap'
import styled, { useTheme } from 'styled-components'
import { ImCross } from 'react-icons/im'
import { AlgorithmInput } from 'src/types'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import { UlGeneric } from '../Common/List'

export function QuerySequenceList() {
  const { t } = useTranslationSafe()
  const { qryInputs, clearQryInputs } = useQuerySeqInputs()

  const listItems = useMemo(() => {
    return qryInputs.map((input, index) => (
      <Li key={input.uid}>
        <InputFileInfo input={input} index={index} />
      </Li>
    ))
  }, [qryInputs])

  const headerText = useMemo(() => {
    if (qryInputs.length === 0) {
      return null
    }
    return (
      <div className="d-flex">
        <h4>{t("Sequence data you've added")}</h4>
        <Button className="ml-auto" color="link" onClick={clearQryInputs} title={t('Remove all input files')}>
          {t('Remove all')}
        </Button>
      </div>
    )
  }, [clearQryInputs, qryInputs.length, t])

  if (qryInputs.length === 0) {
    return null
  }

  return (
    <>
      {headerText}
      <Ul>{listItems}</Ul>
    </>
  )
}

export const Ul = styled(UlGeneric)`
  flex: 1;
  overflow: auto;
`

export const Li = styled.li`
  margin: 5px 0;
  border-radius: 5px !important;
`

export interface InputFileInfoProps {
  input: AlgorithmInput
  index: number
}

export function InputFileInfo({ input, index }: InputFileInfoProps) {
  const { t } = useTranslationSafe()
  const theme = useTheme()
  const { removeQryInput } = useQuerySeqInputs()
  const onRemoveClicked = useCallback(() => {
    removeQryInput(index)
  }, [index, removeQryInput])

  return (
    <Container>
      <h6 className="flex-grow-1 my-auto">{input.description}</h6>
      <ButtonTransparent title={t(' Remove this input')} onClick={onRemoveClicked}>
        <ImCross color={theme.gray500} />
      </ButtonTransparent>
    </Container>
  )
}

const Container = styled.section`
  display: flex;
  padding: 0.5rem 1rem;
  box-shadow: 0 0 12px 0 #0002;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`
