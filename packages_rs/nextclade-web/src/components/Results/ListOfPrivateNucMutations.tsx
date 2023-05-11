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

  const { reversions, labeled, unlabeled } = privateNucMutationsInternal

  return (
    <div className="d-flex">
      <div className="mr-auto">
        <UlInvisible className="pl-2">
          {reversions.length > 0 && (
            <LiInvisible>
              <TableSlim className="mb-0">
                <tbody>
                  <tr>
                    <td>{t('Reversions ({{ n }})', { n: reversions.length })}</td>
                  </tr>
                  <tr>
                    <td>
                      <ListOfMutationsGeneric substitutions={reversions} />
                    </td>
                  </tr>
                </tbody>
              </TableSlim>
            </LiInvisible>
          )}

          {labeled.length > 0 && (
            <LiInvisible>
              <TableSlim className="mb-0">
                <tbody>
                  <tr>
                    <td>{t('Labeled private mutations ({{ n }})', { n: labeled.length })}</td>
                  </tr>
                  <tr>
                    <td>
                      <ListOfMutationsLabeled mutationsLabeled={labeled} />
                    </td>
                  </tr>
                </tbody>
              </TableSlim>
            </LiInvisible>
          )}

          {unlabeled.length > 0 && (
            <LiInvisible>
              <TableSlim className="mb-0">
                <tbody>
                  <tr>
                    <td>{t('Unlabeled private mutations ({{ n }})', { n: unlabeled.length })}</td>
                  </tr>
                  <tr>
                    <td>
                      <ListOfMutationsGeneric substitutions={unlabeled} />
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
