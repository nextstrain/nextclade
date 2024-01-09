import React from 'react'

import type { QcResultStopCodons, StopCodonLocation } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { formatStopCodon } from 'src/helpers/formatMutation'

export interface StopCodonsRowsProps {
  stopCodons: StopCodonLocation[]
}

export function StopCodonsItems({ stopCodons }: StopCodonsRowsProps) {
  return (
    <ul>
      {stopCodons.map((sc) => (
        <li key={`${sc.cdsName}_${sc.codon}`}>{formatStopCodon(sc)}</li>
      ))}
    </ul>
  )
}

export interface ListOfStopCodonsProps {
  stopCodons: QcResultStopCodons
}

export function ListOfStopCodons({ stopCodons }: ListOfStopCodonsProps) {
  const { t } = useTranslationSafe()

  return (
    <>
      <h6>{t('Unexpected premature stop codons ({{ n }})', { n: stopCodons.totalStopCodons })}</h6>
      <StopCodonsItems stopCodons={stopCodons.stopCodons} />

      <h6>{t('Known premature stop codons ({{ n }})', { n: stopCodons.totalStopCodonsIgnored })}</h6>
      <StopCodonsItems stopCodons={stopCodons.stopCodonsIgnored} />
    </>
  )
}
