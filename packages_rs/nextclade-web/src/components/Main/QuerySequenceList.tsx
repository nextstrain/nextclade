import React, { useCallback, useMemo } from 'react'
import { BsChevronLeft } from 'react-icons/bs'
import { MdClear } from 'react-icons/md'
import { CiFileOn, CiStar, CiTextAlignJustify, CiLink } from 'react-icons/ci'
import { Button } from 'reactstrap'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { UlGeneric } from 'src/components/Common/List'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import { AlgorithmInput, AlgorithmInputType } from 'src/types'
import styled, { useTheme } from 'styled-components'

export function QuerySequenceList({ toMainPage }: { toMainPage?: () => void }) {
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
      return (
        <div className="d-flex flex-1 mr-auto">
          {toMainPage && (
            <Button className="" color="secondary" onClick={toMainPage} title={t('Go to main page to add input files')}>
              <BsChevronLeft className="mr-1" />
              {t('Add data')}
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="d-flex mt-3">
        <h4>{t("Sequence data you've added")}</h4>

        <div className="d-flex ml-auto">
          <Button className="" color="link" onClick={clearQryInputs} title={t('Remove all input files')}>
            {t('Remove all')}
          </Button>

          {toMainPage && (
            <Button
              className=""
              color="secondary"
              onClick={toMainPage}
              title={t('Go to main page to add more input files')}
            >
              {t('Add more')}
            </Button>
          )}
        </div>
      </div>
    )
  }, [clearQryInputs, qryInputs.length, t, toMainPage])

  return (
    <ContainerMain>
      <div>{headerText}</div>
      <Ul>{listItems}</Ul>
    </ContainerMain>
  )
}

const ContainerMain = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 3px;
`

const Ul = styled(UlGeneric)`
  flex: 1;
  overflow: auto;
  max-height: 320px;
`

export const Li = styled.li`
  margin: 5px 0;
  border-radius: 5px !important;

  text-overflow: ellipsis;
  white-space: nowrap;
`

export const InputNameWrapper = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  width: 0;
`

export const InputName = styled.p`
  margin: auto 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

  const icon = useMemo(() => {
    switch (input.type) {
      case AlgorithmInputType.File: {
        return <CiFileOn size={20} className="mt-1" />
      }
      case AlgorithmInputType.Url: {
        return <CiLink size={20} className="mt-1" />
      }
      case AlgorithmInputType.String: {
        return <CiTextAlignJustify size={20} className="mt-1" />
      }
      case AlgorithmInputType.Default: {
        return <CiStar size={20} className="mt-1" />
      }
      default:
        return null
    }
  }, [input.type])

  return (
    <Container>
      <InputIconWrapper>{icon}</InputIconWrapper>
      <InputNameWrapper>
        <InputName title={input.description}>{input.description}</InputName>
      </InputNameWrapper>
      <ButtonTransparent className="ml-auto" title={t(' Remove this input')} onClick={onRemoveClicked}>
        <MdClear color={theme.gray500} />
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

const InputIconWrapper = styled.div`
  display: flex;
  padding: 0;
  margin: 0;
  max-height: 1.5rem;
  width: 25px;
`
