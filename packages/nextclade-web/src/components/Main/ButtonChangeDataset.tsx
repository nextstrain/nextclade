import React, { useMemo } from 'react'
import { Button, ButtonProps } from 'reactstrap'
import { hasSingleCurrentDatasetAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface DatasetNoneSectionProps {
  toDatasetSelection(): void
}

export function DatasetNoneSection({ toDatasetSelection }: DatasetNoneSectionProps) {
  return (
    <Container>
      <ButtonChangeDataset onClick={toDatasetSelection} />
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  padding: 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;

  min-height: 200px;
`

export interface ChangeDatasetButtonProps extends ButtonProps {
  onClick(): void
}

export function ButtonChangeDataset({ onClick, ...restProps }: ChangeDatasetButtonProps) {
  const { t } = useTranslationSafe()
  const hasDataset = useRecoilValue(hasSingleCurrentDatasetAtom)

  const { color, text, tooltip } = useMemo(() => {
    const text = hasDataset ? t('Change reference dataset') : t('Select reference dataset')
    return {
      color: hasDataset ? 'secondary' : 'primary',
      text,
      tooltip: text,
    }
  }, [hasDataset, t])

  return (
    <ButtonChangeDatasetStyled className="m-auto" color={color} title={tooltip} onClick={onClick} {...restProps}>
      {text}
    </ButtonChangeDatasetStyled>
  )
}

const ButtonChangeDatasetStyled = styled(Button)`
  min-height: 50px;
`
