import React from 'react'

import { Alert as ReactstrapAlert } from 'reactstrap'
import styled from 'styled-components'

import type { AnalysisResult } from 'src/algorithms/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { formatRange } from 'src/helpers/formatRange'
import { ListOfPcrPrimerChanges } from 'src/components/SequenceView/ListOfPcrPrimerChanges'
import { ErrorIcon, getStatusIconAndText, WarningIcon } from 'src/components/Results/getStatusIconAndText'
import { TableSlim as TablSlimBase } from 'src/components/Common/TableSlim'

const Alert = styled(ReactstrapAlert)`
  box-shadow: ${(props) => props.theme.shadows.slight};
  width: 400px;
`

const TableSlim = styled(TablSlimBase)`
  width: 400px;
`

export interface ColumnNameTooltipProps {
  seqName: string
  result?: AnalysisResult
  warnings: string[]
  errors: string[]
}

export function ColumnNameTooltip({ seqName, result, warnings, errors }: ColumnNameTooltipProps) {
  const { t } = useTranslationSafe()

  if (!result) {
    return null
  }

  const { StatusIcon, statusText } = getStatusIconAndText({
    t,
    isDone: !!result,
    hasWarnings: warnings.length > 0,
    hasErrors: errors.length > 0,
  })

  const { clade, alignmentStart, alignmentEnd, alignmentScore, pcrPrimerChanges, totalPcrPrimerChanges } = result

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
            {errors.map((error) => (
              <Alert key={error} color="danger" fade={false} className="px-2 py-1 my-1">
                <ErrorIcon />
                {error}
              </Alert>
            ))}
            {warnings.map((warning) => (
              <Alert key={warning} color="warning" fade={false} className="px-2 py-1 my-1">
                <WarningIcon />
                {warning}
              </Alert>
            ))}
          </td>
        </tr>
      </tbody>
    </TableSlim>
  )
}
