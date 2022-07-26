import { isEmpty, isNil } from 'lodash'
import React, { useMemo } from 'react'
import { Alert as ReactstrapAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'

import { analysisResultAtom } from 'src/state/results.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { formatRange } from 'src/helpers/formatRange'
import { ListOfPcrPrimerChanges } from 'src/components/SequenceView/ListOfPcrPrimerChanges'
import { ErrorIcon, getStatusIconAndText, WarningIcon } from 'src/components/Results/getStatusIconAndText'
import { TableSlim as TableSlimBase } from 'src/components/Common/TableSlim'
import { SeqNameHeading } from 'src/components/Common/SeqNameHeading'

const Alert = styled(ReactstrapAlert)`
  box-shadow: ${(props) => props.theme.shadows.slight};
  width: 400px;
`

const TableSlim = styled(TableSlimBase)`
  width: 400px;
`

export interface ColumnNameTooltipProps {
  index: number
}

export function ColumnNameTooltip({ index }: ColumnNameTooltipProps) {
  const { t } = useTranslationSafe()
  const { result, error } = useRecoilValue(analysisResultAtom(index))

  const { StatusIcon, statusText } = useMemo(
    () =>
      getStatusIconAndText({
        t,
        hasWarnings: !isEmpty(result?.analysisResult.warnings),
        hasErrors: !isNil(error),
      }),
    [error, result?.analysisResult.warnings, t],
  )

  const warningComponents = useMemo(() => {
    return (result?.analysisResult?.warnings ?? []).map((warning) => (
      <Alert key={`${warning.geneName}: ${warning.warning}`} color="warning" fade={false} className="px-2 py-1 my-1">
        <WarningIcon />
        {warning.warning}
      </Alert>
    ))
  }, [result?.analysisResult?.warnings])

  if (!result?.analysisResult) {
    return null
  }

  const { seqName, clade, alignmentStart, alignmentEnd, alignmentScore, pcrPrimerChanges, totalPcrPrimerChanges } =
    result.analysisResult

  return (
    <TableSlim borderless className="mb-1">
      <thead />
      <tbody>
        <tr>
          <td colSpan={2}>
            <SeqNameHeading className="mb-2">{seqName}</SeqNameHeading>
          </td>
        </tr>

        <tr className="mb-2">
          <td>{t('Sequence index')} </td>
          <td>{index}</td>
        </tr>

        <tr>
          <td>{t('Analysis status')}</td>
          <td>
            <StatusIcon size={18} />
            {statusText}
          </td>
        </tr>

        <tr>
          <td>{t('Clade')}</td>
          <td>{clade}</td>
        </tr>

        <tr>
          <td>{t('Alignment range')}</td>
          <td>{formatRange(alignmentStart, alignmentEnd)}</td>
        </tr>

        <tr>
          <td>{t('Alignment score')}</td>
          <td>{alignmentScore}</td>
        </tr>

        <tr>
          <td colSpan={2}>
            <div className="mt-2" />
          </td>
        </tr>

        {pcrPrimerChanges.length > 0 && (
          <ListOfPcrPrimerChanges pcrPrimerChanges={pcrPrimerChanges} totalPcrPrimerChanges={totalPcrPrimerChanges} />
        )}

        <tr>
          <td colSpan={2}>{warningComponents}</td>
        </tr>
      </tbody>
    </TableSlim>
  )
}

export interface ColumnNameErrorTooltipProps {
  index: number
  seqName: string
  error: string
}

export function ColumnNameErrorTooltip({ index, seqName, error }: ColumnNameErrorTooltipProps) {
  const { t } = useTranslationSafe()

  return (
    <TableSlim borderless className="mb-1">
      <thead />
      <tbody>
        <tr>
          <td colSpan={2}>
            <SeqNameHeading className="mb-2">{seqName}</SeqNameHeading>
          </td>
        </tr>

        <tr className="mb-2">
          <td>{t('Sequence index')} </td>
          <td>{index}</td>
        </tr>

        <tr>
          <td>{t('Analysis status')}</td>
          <td>
            <ErrorIcon size={18} />
            {t('Failed')}
          </td>
        </tr>

        <tr>
          <td colSpan={2}>
            <Alert key={error} color="danger" fade={false} className="px-2 py-1 my-1">
              <ErrorIcon />
              {error}
            </Alert>
          </td>
        </tr>
      </tbody>
    </TableSlim>
  )
}
