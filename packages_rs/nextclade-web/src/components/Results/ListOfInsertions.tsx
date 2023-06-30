import React, { useMemo } from 'react'

import { shade } from 'polished'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'

import type { Aminoacid, AaIns, Nucleotide, NucleotideInsertion } from 'src/types'
import { getTextColor } from 'src/helpers/getTextColor'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { theme } from 'src/theme'

const INSERTION_MAX_LENGTH = 30 as const

const InsertionsTable = styled(TableSlimWithBorders)`
  min-width: 400px;
`

const ThNormal = styled.th`
  width: 100px;
`

const ThFragment = styled.th`
  min-width: 200px;
`

const TdNormal = styled.td`
  min-width: 80px;
`

const TdFragment = styled.td`
  min-width: 200px;
`

const InsertedLetterColored = styled.span<{ $bg: string; $fg: string }>`
  background-color: ${(props) => props.$bg};
  color: ${(props) => props.$fg};
  font-family: ${(props) => props.theme.font.monospace};
  display: inline-block;
  line-height: 1rem;
  text-align: center;
  width: 1rem;
  height: 1rem;
`

export interface InsertedCharacterProps {
  letter: string
  isAminoacid?: boolean
}

export function InsertedCharacter({ letter, isAminoacid }: InsertedCharacterProps) {
  const { bg, fg } = useMemo(() => {
    const color = isAminoacid ? getAminoacidColor(letter as Aminoacid) : getNucleotideColor(letter as Nucleotide)
    const bg = shade(0.33)(color)
    const fg = getTextColor(theme, bg)
    return { bg, fg }
  }, [isAminoacid, letter])
  return (
    <InsertedLetterColored $bg={bg} $fg={fg}>
      {letter}
    </InsertedLetterColored>
  )
}

export interface InsertedFragmentProps {
  insertion: string
  isAminoacid?: boolean
}

export function InsertedFragment({ insertion, isAminoacid }: InsertedFragmentProps) {
  const ins = useMemo(
    () =>
      insertion
        .split('')
        // eslint-disable-next-line react/no-array-index-key
        .map((letter, i) => <InsertedCharacter key={`${i}-${letter}`} letter={letter} isAminoacid={isAminoacid} />),
    [insertion, isAminoacid],
  )

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{ins}</>
}

export interface InsertedFragmentTruncatedProps {
  insertion: string
  isAminoacid?: boolean
}

export function InsertedFragmentTruncated({ insertion, isAminoacid }: InsertedFragmentTruncatedProps) {
  const { t } = useTranslation()

  const { ins, truncatedText } = useMemo(() => {
    const TRUNCATED_TEXT = t(' ... (truncated)')

    const targetLength = INSERTION_MAX_LENGTH - TRUNCATED_TEXT.length

    let ins = insertion
    let truncatedText: string | undefined
    if (ins.length > targetLength) {
      ins = insertion.slice(0, targetLength)
      truncatedText = TRUNCATED_TEXT
    }
    return { ins, truncatedText }
  }, [insertion, t])

  return (
    <span>
      <InsertedFragment insertion={ins} isAminoacid={isAminoacid} />
      <span>{truncatedText}</span>
    </span>
  )
}

export interface ListOfInsertionsNucProps {
  insertions: NucleotideInsertion[]
  totalInsertions: number
}

export function ListOfInsertionsNuc({ insertions }: ListOfInsertionsNucProps) {
  const { t } = useTranslation()

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <tr>
        <ThNormal className="text-center">{t('After ref pos.')}</ThNormal>
        <ThNormal className="text-center">{t('Length')}</ThNormal>
        <ThFragment className="text-center">{t('Inserted fragment')}</ThFragment>
      </tr>
    )

    const insertionsTruncated = insertions.slice(0, 20)
    const tbody = insertionsTruncated.map(({ pos, ins }) => (
      <tr key={pos}>
        <TdNormal className="text-center">{pos + 1}</TdNormal>
        <TdNormal className="text-center">{ins.length}</TdNormal>
        <TdFragment className="text-left">
          <InsertedFragmentTruncated insertion={ins} />
        </TdFragment>
      </tr>
    ))

    if (insertionsTruncated.length < insertions.length) {
      tbody.push(
        <tr key="trunc">
          <td colSpan={3} className="text-center">
            {'...truncated'}
          </td>
        </tr>,
      )
    }

    return { thead, tbody }
  }, [insertions, t])

  if (insertions.length === 0) {
    return null
  }

  return (
    <InsertionsTable>
      <thead>{thead}</thead>
      <tbody>{tbody}</tbody>
    </InsertionsTable>
  )
}

export interface ListOfInsertionsAaProps {
  insertions: AaIns[]
  totalInsertions: number
  isAminoacid?: boolean
}

export function ListOfInsertionsAa({ insertions }: ListOfInsertionsAaProps) {
  const { t } = useTranslation()

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <tr>
        <ThNormal className="text-center">{t('Gene.')}</ThNormal>
        <ThNormal className="text-center">{t('After ref pos.')}</ThNormal>
        <ThNormal className="text-center">{t('Length')}</ThNormal>
        <ThFragment className="text-center">{t('Inserted fragment')}</ThFragment>
      </tr>
    )

    const insertionsTruncated = insertions.slice(0, 20)
    const tbody = insertionsTruncated.map(({ pos, ins, gene }) => (
      <tr key={pos}>
        <TdNormal className="text-center">{gene}</TdNormal>
        <TdNormal className="text-center">{pos + 1}</TdNormal>
        <TdNormal className="text-center">{ins.length}</TdNormal>
        <TdFragment className="text-left">
          <InsertedFragmentTruncated insertion={ins} isAminoacid />
        </TdFragment>
      </tr>
    ))

    if (insertionsTruncated.length < insertions.length) {
      tbody.push(
        <tr key="trunc">
          <td colSpan={3} className="text-center">
            {'...truncated'}
          </td>
        </tr>,
      )
    }

    return { thead, tbody }
  }, [insertions, t])

  if (insertions.length === 0) {
    return null
  }

  return (
    <InsertionsTable>
      <thead>{thead}</thead>
      <tbody>{tbody}</tbody>
    </InsertionsTable>
  )
}
