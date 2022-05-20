import React, { SVGProps, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { NucleotideSubstitution } from 'src/algorithms/types'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { AminoacidMutationBadge, NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { TableSlim } from 'src/components/Common/TableSlim'

export interface SequenceMarkerMutationProps extends SVGProps<SVGRectElement> {
  seqName: string
  substitution: NucleotideSubstitution
  pixelsPerBase: number
}

function SequenceMarkerMutationUnmemoed({
  seqName,
  substitution,
  pixelsPerBase,
  ...rest
}: SequenceMarkerMutationProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { pos, queryNuc, aaSubstitutions, aaDeletions } = substitution
  const id = getSafeId('mutation-marker', { seqName, ...substitution })

  const fill = getNucleotideColor(queryNuc)
  const width = Math.max(BASE_MIN_WIDTH_PX, pixelsPerBase)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = pos * pixelsPerBase - halfNuc

  const totalAaChanges = aaSubstitutions.length + aaDeletions.length

  return (
    <rect
      id={id}
      fill={fill}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <td colSpan={2}>
                <h6>
                  <span>{t('Nucleotide substitution')}</span>
                  <span> </span>
                  <span>
                    <NucleotideMutationBadge mutation={substitution} />
                  </span>
                </h6>
              </td>
            </tr>

            {totalAaChanges > 0 && (
              <tr>
                <td colSpan={2}>
                  <h6 className="mt-1">{t('Affected codons:')}</h6>
                </td>
              </tr>
            )}

            {aaSubstitutions.map((mut) => (
              <tr key={mut.codon}>
                <td>{t('Aminoacid substitution')}</td>
                <td>
                  <AminoacidMutationBadge mutation={mut} />
                </td>
              </tr>
            ))}

            {aaDeletions.map((del) => (
              <tr key={del.queryContext}>
                <td>{t('Aminoacid deletion')}</td>
                <td>
                  <AminoacidMutationBadge mutation={del} />
                </td>
              </tr>
            ))}

            {/* <tr> */}
            {/*   <td colSpan={2}> */}
            {/*     {pcrPrimersChanged.length > 0 && ( */}
            {/*       <Row noGutters className="mt-2"> */}
            {/*         <Col> */}
            {/*           <ListOfPcrPrimersChanged pcrPrimersChanged={pcrPrimersChanged} /> */}
            {/*         </Col> */}
            {/*       </Row> */}
            {/*     )} */}
            {/*   </td> */}
            {/* </tr> */}
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMutation = React.memo(SequenceMarkerMutationUnmemoed)
