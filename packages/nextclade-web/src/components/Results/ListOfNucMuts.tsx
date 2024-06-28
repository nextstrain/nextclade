import { isEmpty, isNil } from 'lodash'
import React, { ReactNode } from 'react'
import { useRecoilValue } from 'recoil'
import { REF_NODE_PARENT } from 'src/constants'
import { getNucMutations } from 'src/helpers/relativeMuts'
import { currentRefNodeNameAtom } from 'src/state/results.state'
import { type AnalysisResult, NucSub, NucSubLabeled } from 'src/types'
import { LiInvisible, UlInvisible } from 'src/components/Common/List'
import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ListOfMutationsLabeled } from './ListOfMutationsLabeled'

export interface ListOfPrivateNucMutationsProps {
  analysisResult: AnalysisResult
}

export function ListOfNucMuts({ analysisResult }: ListOfPrivateNucMutationsProps) {
  const { t } = useTranslationSafe()

  const refNodeName = useRecoilValue(currentRefNodeNameAtom)
  const muts = getNucMutations(analysisResult, refNodeName)
  if (!muts) {
    return null
  }

  const { subs, relMuts } = muts

  return (
    <div className="d-flex">
      <div className="mr-auto">
        <UlInvisible className="pl-2">
          <ListOfNucMutationsOneType heading={t('All substitutions ({{ n }})', { n: subs.length })} subs={subs} />
        </UlInvisible>

        <UlInvisible className="pl-2">
          <ListOfNucMutationsOneType
            heading={t('Reversion substitutions ({{ n }})', { n: relMuts?.reversionSubstitutions.length })}
            subs={relMuts?.reversionSubstitutions}
          />

          {refNodeName === REF_NODE_PARENT && (
            <ListOfNucMutationsOneTypeLabelled
              heading={t('Labeled substitutions ({{ n }})', { n: relMuts?.labeledSubstitutions.length })}
              subs={relMuts?.labeledSubstitutions}
            />
          )}

          {refNodeName === REF_NODE_PARENT && (
            <ListOfNucMutationsOneType
              heading={t('Unlabeled substitutions ({{ n }})', { n: relMuts?.unlabeledSubstitutions.length })}
              subs={relMuts?.unlabeledSubstitutions}
            />
          )}
        </UlInvisible>
      </div>
    </div>
  )
}

function ListOfNucMutationsOneType({ heading, subs }: { heading: ReactNode; subs: NucSub[] | undefined }) {
  if (isNil(subs) || isEmpty(subs)) {
    return null
  }

  return (
    <LiInvisible>
      <TableSlim className="mb-0">
        <tbody>
          <tr>
            <td>{heading}</td>
          </tr>
          <tr>
            <td>
              <ListOfMutationsGeneric substitutions={subs} />
            </td>
          </tr>
        </tbody>
      </TableSlim>
    </LiInvisible>
  )
}

function ListOfNucMutationsOneTypeLabelled({
  heading,
  subs,
}: {
  heading: ReactNode
  subs: NucSubLabeled[] | undefined
}) {
  if (isNil(subs) || isEmpty(subs)) {
    return null
  }

  return (
    <LiInvisible>
      <TableSlim className="mb-0">
        <tbody>
          <tr>
            <td>{heading}</td>
          </tr>
          <tr>
            <td>
              <ListOfMutationsLabeled mutationsLabeled={subs} />
            </td>
          </tr>
        </tbody>
      </TableSlim>
    </LiInvisible>
  )
}
