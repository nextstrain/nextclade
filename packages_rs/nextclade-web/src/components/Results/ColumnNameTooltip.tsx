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

const Alert = styled(ReactstrapAlert)`
  box-shadow: ${(props) => props.theme.shadows.slight};
  width: 400px;
`

const TableSlim = styled(TableSlimBase)`
  width: 400px;
`

export interface ColumnNameTooltipProps {
  seqName: string
}

export function ColumnNameTooltip({ seqName }: ColumnNameTooltipProps) {
  const { t } = useTranslationSafe()
  const { result, error } = useRecoilValue(analysisResultAtom(seqName))

  const { StatusIcon, statusText } = useMemo(
    () =>
      getStatusIconAndText({
        t,
        hasWarnings: !isEmpty(result?.analysisResult.warnings),
        hasErrors: !isNil(error),
      }),
    [error, result?.analysisResult.warnings, t],
  )

  const errorComponent = useMemo(() => {
    return (
      <Alert key={error} color="danger" fade={false} className="px-2 py-1 my-1">
        <ErrorIcon />
        {error}
      </Alert>
    )
  }, [error])

  const warningComponents = useMemo(() => {
    return (result?.analysisResult?.warnings ?? []).map((warning) => (
      <Alert key={warning} color="warning" fade={false} className="px-2 py-1 my-1">
        <WarningIcon />
        {warning}
      </Alert>
    ))
  }, [result?.analysisResult?.warnings])

  if (!result?.analysisResult) {
    return null
  }

  const { clade, alignmentStart, alignmentEnd, alignmentScore, pcrPrimerChanges, totalPcrPrimerChanges } =
    result.analysisResult

  return (
    <TableSlim borderless className="mb-1">
      <thead />
      <tbody>
        <tr>
          <td colSpan={2}>
            <h5 className="mb-2">{seqName}</h5>
          </td>
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
          <td colSpan={2}>
            {errorComponent}
            {warningComponents}
          </td>
        </tr>
      </tbody>
    </TableSlim>
  )
}
