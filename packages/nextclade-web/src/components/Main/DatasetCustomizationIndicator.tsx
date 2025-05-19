import React, { useMemo } from 'react'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import { MdClear as IconClearBase } from 'react-icons/md'
import { Link } from 'src/components/Link/Link'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetFilesResetAtom, inputCustomizationCounterAtom } from 'src/state/inputs.state'

export function DatasetCustomizationIndicator({ ...restProps }) {
  const { t } = useTranslationSafe()
  const inputCustomizationCounter = useRecoilValue(inputCustomizationCounterAtom)
  const text = useMemo(
    () => t('Dataset files currently customized: {{n}}', { n: inputCustomizationCounter }),
    [inputCustomizationCounter, t],
  )

  if (inputCustomizationCounter === 0) {
    return null
  }
  return (
    <DatasetCustomizationIndicatorIcon size={20} title={text} {...restProps}>
      {inputCustomizationCounter}
    </DatasetCustomizationIndicatorIcon>
  )
}

export const DatasetCustomizationIndicatorIcon = styled.span<{ size: number }>`
  color: ${(props) => props.theme.gray200};
  background-color: ${(props) => props.theme.danger};
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: ${(props) => props.size}px;
  margin-left: 0.5rem;
  padding: 0 0.25rem;
`

export function DatasetCustomizationsIndicatorLink() {
  const { t } = useTranslationSafe()
  const inputCustomizationCounter = useRecoilValue(inputCustomizationCounterAtom)

  const text = useMemo(
    () => t('Dataset files currently customized: {{n}}', { n: inputCustomizationCounter }),
    [inputCustomizationCounter, t],
  )

  const resetCustomizations = useResetRecoilState(datasetFilesResetAtom)

  if (inputCustomizationCounter === 0) {
    return null
  }

  return (
    <Row noGutters className="d-flex">
      <Col className="d-flex mr-auto mt-2">
        <DatasetCustomizationWrapper>
          <div className="d-flex">
            <CustomizationLink href="/dataset#customize" title={text}>
              <span className="text-danger">{t('Customizations')}</span>
              <DatasetCustomizationIndicator />
            </CustomizationLink>
            <ButtonClear onClick={resetCustomizations} title={t('Reset customizations')}>
              <IconClear size={15} />
            </ButtonClear>
          </div>
        </DatasetCustomizationWrapper>
      </Col>
    </Row>
  )
}

const DatasetCustomizationWrapper = styled.div`
  margin-left: 90px;
`

const CustomizationLink = styled(Link)`
  &:hover {
    text-decoration: ${(props) => props.theme.danger} underline solid;
  }
`

const ButtonClear = styled(ButtonTransparent)`
  display: flex;
  margin-left: 0.5rem;
`

const IconClear = styled(IconClearBase)`
  * {
    color: ${(props) => props.theme.gray500};
  }
`
