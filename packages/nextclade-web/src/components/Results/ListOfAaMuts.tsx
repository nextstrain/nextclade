import { isEmpty, isNil } from 'lodash'
import React, { ReactNode } from 'react'
import { useRecoilValue } from 'recoil'
import { REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
import { getAaMutations } from 'src/helpers/relativeMuts'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { currentRefNodeNameAtom } from 'src/state/results.state'
import { type AnalysisResult, AaSub, AaSubLabeled } from 'src/types'
import { LiInvisible, UlInvisible } from 'src/components/Common/List'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ListOfAaMutationsGeneric } from './ListOfAaMutationsGeneric'
import { ListOfAaMutationsLabeled } from './ListOfAaMutationsLabeled'

export interface ListOfPrivateAaMutationsProps {
  analysisResult: AnalysisResult
}

export function ListOfAaMuts({ analysisResult }: ListOfPrivateAaMutationsProps) {
  const { t } = useTranslationSafe()

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const refNodeName = useRecoilValue(currentRefNodeNameAtom({ datasetName }))
  const muts = getAaMutations(analysisResult, refNodeName ?? REF_NODE_ROOT)
  if (!muts) {
    return null
  }

  const { aaSubs, relAaMuts } = muts

  // Flatten all the private mutations from all genes
  const allReversionSubstitutions = relAaMuts?.flatMap((m) => m.reversionSubstitutions) ?? []
  const allLabeledSubstitutions = relAaMuts?.flatMap((m) => m.labeledSubstitutions) ?? []
  const allUnlabeledSubstitutions = relAaMuts?.flatMap((m) => m.unlabeledSubstitutions) ?? []

  return (
    <div className="d-flex">
      <div className="mr-auto">
        <UlInvisible className="pl-2">
          <ListOfAaMutationsOneType heading={t('All substitutions ({{ n }})', { n: aaSubs.length })} subs={aaSubs} />
        </UlInvisible>

        <UlInvisible className="pl-2">
          <ListOfAaMutationsOneType
            heading={t('Reversion substitutions ({{ n }})', { n: allReversionSubstitutions.length })}
            subs={allReversionSubstitutions}
          />

          {refNodeName === REF_NODE_PARENT && (
            <ListOfAaMutationsOneTypeLabelled
              heading={t('Labeled substitutions ({{ n }})', { n: allLabeledSubstitutions.length })}
              subs={allLabeledSubstitutions}
            />
          )}

          {refNodeName === REF_NODE_PARENT && (
            <ListOfAaMutationsOneType
              heading={t('Unlabeled substitutions ({{ n }})', { n: allUnlabeledSubstitutions.length })}
              subs={allUnlabeledSubstitutions}
            />
          )}

          {refNodeName !== REF_NODE_PARENT && (
            <small>
              {t(
                'To see private mutations (and labeled mutations if applicable), switch to "Parent" in the "Relative to" dropdown',
              )}
            </small>
          )}
        </UlInvisible>
      </div>
    </div>
  )
}

function ListOfAaMutationsOneType({ heading, subs }: { heading: ReactNode; subs: AaSub[] | undefined }) {
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
              <ListOfAaMutationsGeneric substitutions={subs} />
            </td>
          </tr>
        </tbody>
      </TableSlim>
    </LiInvisible>
  )
}

function ListOfAaMutationsOneTypeLabelled({ heading, subs }: { heading: ReactNode; subs: AaSubLabeled[] | undefined }) {
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
              <ListOfAaMutationsLabeled mutationsLabeled={subs} />
            </td>
          </tr>
        </tbody>
      </TableSlim>
    </LiInvisible>
  )
}
