import React, { useCallback, useMemo } from 'react'
import { Button, Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'
import { ImCross } from 'react-icons/im'
import { rgba } from 'polished'

import { AlgorithmInput } from 'src/types'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useQuerySeqInputs } from 'src/state/inputs.state'

const SequencesCurrentWrapper = styled(Container)`
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

const InputFileInfoWrapper = styled.section`
  box-shadow: ${(props) => `1px 1px 5px ${rgba(props.theme.black, 0.1)}`};
  border: 1px #ccc9 solid;
  border-radius: 5px;
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
`

export interface InputFileInfoProps {
  input: AlgorithmInput
  index: number
}

export function InputFileInfo({ input, index }: InputFileInfoProps) {
  const { t } = useTranslationSafe()
  const { removeQryInput } = useQuerySeqInputs()
  const onRemoveClicked = useCallback(() => {
    removeQryInput(index)
  }, [index, removeQryInput])

  return (
    <InputFileInfoWrapper>
      <Row noGutters className="d-flex">
        <Col className="flex-grow-1">{input.description}</Col>
        <ButtonTransparent title={t('Remove this input')} onClick={onRemoveClicked}>
          <ImCross />
        </ButtonTransparent>
      </Row>
    </InputFileInfoWrapper>
  )
}

export function QuerySequenceList() {
  const { t } = useTranslationSafe()
  const { qryInputs, clearQryInputs } = useQuerySeqInputs()

  const inputComponents = useMemo(
    () => (
      <Row noGutters>
        <Col>
          {qryInputs.map((input, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <InputFileInfo key={`${input.name} ${index}`} input={input} index={index} />
          ))}
        </Col>
      </Row>
    ),
    [qryInputs],
  )

  const removeButton = useMemo(
    () =>
      qryInputs.length > 0 ? (
        <Row noGutters>
          <Col className="d-flex w-100">
            <Button className="ml-auto" color="link" onClick={clearQryInputs} title={t('Remove all input files')}>
              {t('Remove all')}
            </Button>
          </Col>
        </Row>
      ) : null,

    [clearQryInputs, qryInputs.length, t],
  )
  const headerText = useMemo(() => {
    if (qryInputs.length === 0) {
      return null
    }
    return (
      <Row noGutters>
        <Col>
          <h4>{t("Sequence data you've added")}</h4>
        </Col>
      </Row>
    )
  }, [qryInputs.length, t])

  if (qryInputs.length === 0) {
    return null
  }

  return (
    <section className="my-2">
      {headerText}
      <SequencesCurrentWrapper>
        <Row noGutters>
          <Col>
            {inputComponents}
            {removeButton}
          </Col>
        </Row>
      </SequencesCurrentWrapper>
    </section>
  )
}
