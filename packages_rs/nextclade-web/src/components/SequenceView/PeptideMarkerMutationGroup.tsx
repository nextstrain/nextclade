import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { Row, Col } from 'reactstrap'
import styled from 'styled-components'
import type { AaChangeWithContext, AaChangesGroup } from 'src/types'
import { AA_MIN_WIDTH_PX } from 'src/constants'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableRowSpacer, TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { SeqNameHeading } from 'src/components/Common/SeqNameHeading'
import { AminoacidMutationBadge, NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { formatRange } from 'src/helpers/formatRange'
import { PeptideContext } from './PeptideContext'

export interface PeptideMarkerMutationProps {
  change: AaChangeWithContext
  parentGroup: AaChangesGroup
  pixelsPerAa: number
}

export function PeptideMarkerMutation({ change, parentGroup, pixelsPerAa, ...restProps }: PeptideMarkerMutationProps) {
  const { pos, qryAa } = change
  const { range } = parentGroup
  const x = (pos - range.begin) * pixelsPerAa
  const fill = getAminoacidColor(qryAa)
  return <rect fill={fill} stroke="#777a" strokeWidth={0.5} x={x} width={pixelsPerAa} height="30" {...restProps} />
}

export interface PeptideMarkerMutationGroupProps extends SVGProps<SVGSVGElement> {
  index: number
  seqName: string
  group: AaChangesGroup
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

  const { name, range, changes: changesWithContext, nucSubs, nucDels } = group
  const mutationsOnly = changesWithContext.filter((change) => change.qryAa !== change.refAa)

  const contextTitle = useMemo(() => t('Context'), [t])

  const footerNote = useMemo(
    () => (
      <Row noGutters>
        <Col>
          <p className="small">
            {t('Note that for reverse strands Nextclade chooses to display amino acid context')}
            <br />
            {t('in forward direction, and nucleotide context in reverse direction')}
          </p>
        </Col>
      </Row>
    ),
    [t],
  )

  const id = getSafeId('aa-mutation-group-marker', {
    index,
    seqName,
    name,
    ...mutationsOnly.map((mut) => mut.pos),
  })

  const minWidth = (AA_MIN_WIDTH_PX * 6) / (5 + changesWithContext.length)
  const pixelsPerAaAdjusted = Math.max(minWidth, pixelsPerAa)
  const width = changesWithContext.length * Math.max(pixelsPerAaAdjusted, pixelsPerAa)

  // position mutation group at 'center of group' - half the group width
  const x = ((range.begin + range.end) * pixelsPerAa - (range.end - range.begin) * pixelsPerAaAdjusted) / 2

  const outline = useMemo(() => {
    const width = (changesWithContext.length - 2) * Math.max(pixelsPerAaAdjusted, pixelsPerAa)
    // position mutation group at 'center of group' - half the group width
    const x =
      ((range.begin + 1 + range.end - 1) * pixelsPerAa - (range.end - 1 - (range.begin + 1)) * pixelsPerAaAdjusted) / 2

    // return <rect fill="transparent" x={x} y={-10} width={width} stroke="black" strokeWidth={3} height={32} />
    return <AaMutGroupOutline x={pixelsPerAaAdjusted} y={0.5} width={width} height={28} />
  }, [mutationsOnly.length, pixelsPerAa, pixelsPerAaAdjusted, range.begin, range.end])

  let changesHead = mutationsOnly
  let changesTail: typeof mutationsOnly = []
  if (mutationsOnly.length > 6) {
    changesHead = mutationsOnly.slice(0, 3)
    changesTail = mutationsOnly.slice(-3)
  }

  const totalNucChanges = nucSubs.length + nucDels.length

  return (
    <g id={id}>
      <svg x={x} y={-9.5} height={29} {...restProps}>
        <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          {mutationsOnly.map((mut) => (
            <PeptideMarkerMutation key={mut.pos} change={mut} parentGroup={group} pixelsPerAa={pixelsPerAaAdjusted} />
          ))}
          {outline}

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
                    <h6>{t('Aminoacid changes ({{ n }})', { n: mutationsOnly.length })}</h6>
                  </td>
                </tr>

                {changesHead.map((change) => (
                  <tr key={change.pos}>
                    <td>{change.qryAa === '-' ? t('Deletion') : t('Substitution')}</td>
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
                    <tr key={change.pos}>
                      <td>{change.qryAa === '-' ? t('Deletion') : t('Substitution')}</td>
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

                {nucSubs.map((mut) => (
                  <tr key={mut.pos}>
                    <td>{t('Substitution')}</td>
                    <td>{<NucleotideMutationBadge mutation={mut} />}</td>
                  </tr>
                ))}

                {nucDels.map((del) => {
                  const rangeStr = formatRange(del.range)
                  return (
                    <tr key={rangeStr}>
                      <td>{t('Deletion')}</td>
                      <td>{}</td>
                    </tr>
                  )
                })}

                <tr>
                  <td colSpan={2}>
                    <Row noGutters className="mt-3">
                      <Col>
                        <h6>{contextTitle}</h6>
                      </Col>
                    </Row>

                    <Row noGutters>
                      <Col>
                        <PeptideContext group={group} />
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

const AaMutGroupOutline = styled.rect`
  fill: none;
  stroke: transparent;
  stroke-width: 0.5px;

  &:hover {
    stroke: ${(props) => props.theme.gray700};
  }
`
