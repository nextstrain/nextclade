import React from 'react'

import { PrivateMutationsInternal } from 'src/types'
import { LiInvisible, UlInvisible } from 'src/components/Common/List'

import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ListOfMutationsLabeled } from './ListOfMutationsLabeled'

export interface ListOfPrivateNucMutationsProps {
  privateNucMutationsInternal: PrivateMutationsInternal
}

export function ListOfPrivateNucMutations({ privateNucMutationsInternal }: ListOfPrivateNucMutationsProps) {
  const { t } = useTranslationSafe()

  const { reversionSubstitutions, labeledSubstitutions, unlabeledSubstitutions } = privateNucMutationsInternal

  return (
    <div className="d-flex">
      <div className="mr-auto">
        <UlInvisible className="pl-2">
          {reversionSubstitutions.length > 0 && (
            <LiInvisible>
              <TableSlim className="mb-0">
                <tbody>
                  <tr>
                    <td>{t('Reversions ({{ n }})', { n: reversionSubstitutions.length })}</td>
                  </tr>
                  <tr>
                    <td>
                      <ListOfMutationsGeneric substitutions={reversionSubstitutions} />
                    </td>
                  </tr>
                </tbody>
              </TableSlim>
            </LiInvisible>
          )}

          {labeledSubstitutions.length > 0 && (
            <LiInvisible>
              <TableSlim className="mb-0">
                <tbody>
                  <tr>
                    <td>{t('Labeled private mutations ({{ n }})', { n: labeledSubstitutions.length })}</td>
                  </tr>
                  <tr>
                    <td>
                      <ListOfMutationsLabeled mutationsLabeled={labeledSubstitutions} />
                    </td>
                  </tr>
                </tbody>
              </TableSlim>
            </LiInvisible>
          )}

          {unlabeledSubstitutions.length > 0 && (
            <LiInvisible>
              <TableSlim className="mb-0">
                <tbody>
                  <tr>
                    <td>{t('Unlabeled private mutations ({{ n }})', { n: unlabeledSubstitutions.length })}</td>
                  </tr>
                  <tr>
                    <td>
                      <ListOfMutationsGeneric substitutions={unlabeledSubstitutions} />
                    </td>
                  </tr>
                </tbody>
              </TableSlim>
            </LiInvisible>
          )}
        </UlInvisible>
      </div>
    </div>
  )
}
