import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { BASE_MIN_WIDTH_PX, GAP } from 'src/constants'

import type { Gene, NucleotideDeletion } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'

import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { Tooltip } from 'src/components/Results/Tooltip'
import { TableSlim } from 'src/components/Common/TableSlim'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'

const gapColor = getNucleotideColor(GAP)

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  seqName: string
  deletion: NucleotideDeletion
  pixelsPerBase: number
  geneMap?: Gene[]
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
})

const mapDispatchToProps = {}

export const SequenceMarkerGapUnmemoed = connect(mapStateToProps, mapDispatchToProps)(SequenceMarkerGapDisconnected)

function SequenceMarkerGapDisconnected({ seqName, deletion, pixelsPerBase, geneMap, ...rest }: MissingViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  if (!geneMap) {
    return null
  }

  const { start: begin, length, aaSubstitutions, aaDeletions } = deletion
  const end = begin + length

  const id = getSafeId('gap-marker', { seqName, ...deletion })

  const x = begin * pixelsPerBase - pixelsPerBase / 2
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  const rangeStr = formatRange(begin, end)

  const totalAaChanges = aaSubstitutions.length + aaDeletions.length

  return (
    <rect
      id={id}
      fill={gapColor}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <td colSpan={2}>
                <h6>{t('Gap: {{range}}', { range: rangeStr })}</h6>
              </td>
            </tr>

            {totalAaChanges > 0 && (
              <tr>
                <td colSpan={2}>
                  <h6 className="mt-1">{t('Affected codons:')}</h6>
                </td>
              </tr>
            )}

            <>
              {aaSubstitutions.map((mut) => (
                <tr key={mut.codon}>
                  <td>{t('Aminoacid substitution')}</td>
                  <td>
                    <AminoacidMutationBadge mutation={mut} geneMap={geneMap} />
                  </td>
                </tr>
              ))}
            </>

            <>
              {aaDeletions.map((del) => (
                <tr key={del.queryContext}>
                  <td>{t('Aminoacid deletion')}</td>
                  <td>
                    <AminoacidMutationBadge mutation={del} geneMap={geneMap} />
                  </td>
                </tr>
              ))}
            </>
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerGap = React.memo(SequenceMarkerGapUnmemoed)
