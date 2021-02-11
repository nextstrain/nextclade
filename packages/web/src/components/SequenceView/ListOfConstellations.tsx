import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { Constellation } from 'src/algorithms/types'
import { Li, Ul } from 'src/components/Common/List'
import { formatAAMutation, formatAADeletion } from 'src/helpers/formatMutation'

export interface ListOfConstellationProps {
  readonly constellations: DeepReadonly<Constellation[]>
}

export function ListOfConstellations({ constellations }: ListOfConstellationProps) {
  const { t } = useTranslation()

  if (constellations === undefined || constellations.length === 0) {
    return <div />
  }

  const items = constellations.map(({ description, url, substitutions, deletions }) => {
    return (
      <Li key={description}>
        <a href={url}>{description}</a>:
        {substitutions.map((mut) => {
          const notation = formatAAMutation(mut)
          return `${notation} `
        })}
        {deletions.map((del) => {
          const notation = formatAADeletion(del)
          return `${notation} `
        })}
      </Li>
    )
  })

  return (
    <div>
      {t(`Documented variant constellation effect(s):`)}
      <Ul>{items}</Ul>
    </div>
  )
}
