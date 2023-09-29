import { isNil } from 'lodash'
import React, { useMemo } from 'react'
import { Button, ButtonProps } from 'reactstrap'
import styled from 'styled-components'
import { useRecoilValue } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetCurrentAtom } from 'src/state/dataset.state'

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

  max-width: 100%;
  height: 110px;
`

export interface ChangeDatasetButtonProps extends ButtonProps {
  onClick(): void
}

export function ButtonChangeDataset({ onClick, ...restProps }: ChangeDatasetButtonProps) {
  const { t } = useTranslationSafe()
  const dataset = useRecoilValue(datasetCurrentAtom)

  const { color, text, tooltip } = useMemo(() => {
    const hasDataset = !isNil(dataset)
    const text = hasDataset ? t('Change dataset') : t('Select dataset')
    return {
      color: hasDataset ? 'secondary' : 'primary',
      text,
      tooltip: text,
    }
  }, [dataset, t])

  return (
    <Button className="m-auto" color={color} title={tooltip} onClick={onClick} {...restProps}>
      {text}
    </Button>
  )
}
