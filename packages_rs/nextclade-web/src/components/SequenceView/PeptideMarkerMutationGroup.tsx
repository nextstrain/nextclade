import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { Row, Col } from 'reactstrap'
import { useRecoilValue } from 'recoil'

import type { AminoacidChange, AminoacidChangesGroup } from 'src/types'
import { AA_MIN_WIDTH_PX } from 'src/constants'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AminoacidMutationBadge, NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { TableRowSpacer, TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { geneAtom } from 'src/state/results.state'
import { SeqNameHeading } from 'src/components/Common/SeqNameHeading'
import { PeptideContext } from './PeptideContext'

export interface PeptideMarkerMutationProps {
  change: AminoacidChange
  parentGroup: AminoacidChangesGroup
  pixelsPerAa: number
}

export function PeptideMarkerMutation({ change, parentGroup, pixelsPerAa, ...restProps }: PeptideMarkerMutationProps) {
  const { codon, queryAA } = change
  const { codonAaRange } = parentGroup

  const pos = codon - codonAaRange.begin
  const x = pos * pixelsPerAa
  const fill = getAminoacidColor(queryAA)

  return <rect fill={fill} stroke="#777a" strokeWidth={0.5} x={x} width={pixelsPerAa} height="30" {...restProps} />
}

export interface PeptideMarkerMutationGroupProps extends SVGProps<SVGSVGElement> {
  index: number
  seqName: string
  group: AminoacidChangesGroup
  pixelsPerAa: number
}

function PeptideMarkerMutationGroupUnmemoed({
  index,
  seqName,
  group,
  pixelsPerAa,
  ...restProps
}: PeptideMarkerMutationGroupProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { gene: geneName, changes, codonAaRange, nucSubstitutions, nucDeletions } = group

  const gene = useRecoilValue(geneAtom(geneName))
  const strand = gene?.strand

  const contextTitle = useMemo(() => {
    if (strand === '-') {
      return 'Context (reverse strand*)'
    }
    return 'Context'
  }, [strand])

  const footerNote = useMemo(() => {
    if (gene?.strand === '-') {
      return (
        <Row noGutters>
          <Col>
            <p className="small">
              {t('* - note that for reverse strands Nextclade chooses to display amino acid context')}
              <br />
              {t('in forward direction, and nucleotide context in reverse direction')}
            </p>
          </Col>
        </Row>
      )
    }
    return null
  }, [gene?.strand, t])

  const id = getSafeId('aa-mutation-group-marker', { index, seqName, geneName, begin: codonAaRange.begin })
  const minWidth = (AA_MIN_WIDTH_PX * 6) / (5 + changes.length)
  const pixelsPerAaAdjusted = Math.max(minWidth, pixelsPerAa)
  const width = changes.length * Math.max(pixelsPerAaAdjusted, pixelsPerAa)
  // position mutation group at 'center of group' - half the group width
  const x =
    ((codonAaRange.begin + codonAaRange.end) * pixelsPerAa -
      (codonAaRange.end - codonAaRange.begin) * pixelsPerAaAdjusted) /
    2

  let changesHead = changes
  let changesTail: typeof changes = []
  if (changes.length > 6) {
    changesHead = changes.slice(0, 3)
    changesTail = changes.slice(-3)
  }

  const totalNucChanges = nucSubstitutions.length + nucDeletions.length

  return (
    <g id={id}>
      <rect fill="#999a" x={x - 0.5} y={-10} width={width + 1} stroke="#aaaa" strokeWidth={0.5} height={32} />
      <svg x={x} y={-9.5} height={29} {...restProps}>
        <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          {changes.map((change) => (
            <PeptideMarkerMutation
              key={change.codon}
              change={change}
              parentGroup={group}
              pixelsPerAa={pixelsPerAaAdjusted}
            />
          ))}

          <Tooltip target={id} isOpen={showTooltip} wide fullWidth>
            <TableSlim borderless className="mb-1">
              <thead />
              <tbody>
                <tr>
                  <td colSpan={2}>
                    <SeqNameHeading>{seqName}</SeqNameHeading>
                  </td>
                </tr>

                <TableRowSpacer />

                <tr className="mb-2">
                  <td colSpan={2}>
                    <h6>{t('Aminoacid changes ({{ n }})', { n: changes.length })}</h6>
                  </td>
                </tr>

                {changesHead.map((change) => (
                  <tr key={change.codon}>
                    <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
                    <td>
                      <AminoacidMutationBadge mutation={change} />
                    </td>
                  </tr>
                ))}

                {changesTail.length > 0 && (
                  <tr>
                    <td>{'...'}</td>
                    <td>{'...'}</td>
                  </tr>
                )}

                {changesTail.length > 0 &&
                  changesTail.map((change) => (
                    <tr key={change.codon}>
                      <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
                      <td>
                        <AminoacidMutationBadge mutation={change} />
                      </td>
                    </tr>
                  ))}

                {totalNucChanges > 0 && (
                  <tr>
                    <td colSpan={2}>
                      <h6 className="mt-3">{t('Nucleotide changes nearby ({{ n }})', { n: totalNucChanges })}</h6>
                    </td>
                  </tr>
                )}

                {nucSubstitutions.map((mut) => (
                  <tr key={mut.pos}>
                    <td>{t('Substitution')}</td>
                    <td>{<NucleotideMutationBadge mutation={mut} />}</td>
                  </tr>
                ))}

                {nucDeletions.map((del) => (
                  <tr key={del.start}>
                    <td>{t('Deletion')}</td>
                    <td>{formatRange(del.start, del.start + del.length)}</td>
                  </tr>
                ))}

                <tr>
                  <td colSpan={2}>
                    <Row noGutters className="mt-3">
                      <Col>
                        <h6>{contextTitle}</h6>
                      </Col>
                    </Row>

                    <Row noGutters>
                      <Col>
                        <PeptideContext group={group} strand={strand} />
                      </Col>
                    </Row>
                  </td>
                </tr>
              </tbody>
            </TableSlim>

            {footerNote}
          </Tooltip>
        </g>
      </svg>
    </g>
  )
}

export const PeptideMarkerMutationGroup = React.memo(PeptideMarkerMutationGroupUnmemoed)
