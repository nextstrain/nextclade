// noinspection JSUnusedLocalSymbols
import type { Cds, Gene, Protein } from '_SchemaRoot'
import { isEmpty } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import ReactSelect from 'react-select'
import type { FilterOptionOption, FormatOptionLabelMeta, StylesConfig, Theme } from 'react-select'
import { Badge as BadgeBase } from 'reactstrap'
import styled from 'styled-components'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { viewedCdsAtom } from 'src/state/seqViewSettings.state'
import { useRecoilState, useRecoilValue } from 'recoil'
import { CDS_OPTION_NUC_SEQUENCE } from 'src/constants'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { genesAtom } from 'src/state/results.state'
import { ensureNumber } from 'src/helpers/number'

const menuPortalTarget = typeof document === 'object' ? document.body : null

export interface Option {
  value: string
  color?: string
  gene?: Gene
  cds?: Cds
  protein?: Protein
  isDisabled?: boolean
}

export function SequenceSelector() {
  const datasetName = useRecoilValue(viewedDatasetNameAtom)

  const genes = useRecoilValue(genesAtom({ datasetName }))
  const [viewedGene, setViewedGene] = useRecoilState(viewedCdsAtom({ datasetName }))

  const { options, defaultOption } = useMemo(() => {
    return prepareOptions(genes ?? [])
  }, [genes])

  const option = useMemo((): Option => {
    if (viewedGene === CDS_OPTION_NUC_SEQUENCE) {
      return { value: CDS_OPTION_NUC_SEQUENCE }
    }
    return options.find((option) => option.cds?.name === viewedGene) ?? defaultOption
  }, [defaultOption, options, viewedGene])

  const onChange = useCallback(
    (option: Option | null) => {
      if (option?.value === CDS_OPTION_NUC_SEQUENCE) {
        setViewedGene(CDS_OPTION_NUC_SEQUENCE)
      }

      if (option?.cds?.name) {
        setViewedGene(option.cds?.name)
      }
    },
    [setViewedGene],
  )

  const filterOptions = useCallback(
    (candidate: FilterOptionOption<Option>, searchTerm: string): boolean =>
      checkSearchCandidateEntry(candidate, searchTerm),
    [],
  )

  const reactSelectTheme = useCallback((theme: Theme): Theme => {
    return {
      ...theme,
      borderRadius: 2,
      spacing: {
        ...theme.spacing,
        menuGutter: 0,
      },
      colors: {
        ...theme.colors,
      },
    }
  }, [])

  const reactSelectStyles = useMemo((): StylesConfig<Option, false> => {
    return {
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      menuList: (base) => ({ ...base, fontSize: '1rem' }),
      option: (base) => ({ ...base, fontSize: '1.0rem', padding: '2px 8px' }),
      singleValue: (base, state) => ({
        ...base,
        fontSize: '1.0rem',
        display: state.selectProps.menuIsOpen ? 'none' : 'block',
      }),
    }
  }, [])

  return (
    <div>
      <ReactSelect
        name="sequence-view-gene-dropdown"
        options={options}
        filterOption={filterOptions}
        formatOptionLabel={OptionLabel}
        isMulti={false}
        value={option}
        onChange={onChange}
        menuPortalTarget={menuPortalTarget}
        styles={reactSelectStyles}
        theme={reactSelectTheme}
        maxMenuHeight={400}
      />
    </div>
  )
}

function OptionLabel(option: Option, meta: FormatOptionLabelMeta<Option>) {
  if (option.gene && option.cds) {
    return <OptionLabelGeneAndCds gene={option.gene} cds={option.cds} />
  }

  if (option.gene) {
    return <OptionLabelGene gene={option.gene} />
  }

  if (option.cds) {
    return <OptionLabelCds cds={option.cds} isMenu={meta.context === 'menu'} />
  }

  if (option.protein) {
    return <OptionLabelProtein protein={option.protein} isMenu={meta.context === 'menu'} />
  }

  if (option.value === CDS_OPTION_NUC_SEQUENCE) {
    return <OptionLabelFullGenome isMenu={meta.context === 'menu'} />
  }

  return null
}

function OptionLabelFullGenome({ isMenu: _ }: { isMenu?: boolean }) {
  const { t } = useTranslationSafe()
  return (
    <Indent>
      <BadgeWide $color="#54AD56" className="mr-1 px-2 py-1" title={t('Nucleotide sequence')}>
        {t('Nucleotide sequence')}
      </BadgeWide>
    </Indent>
  )
}

function OptionLabelGene({ gene }: { gene: Gene; isMenu?: boolean }) {
  const { t } = useTranslationSafe()
  return (
    <Indent title={gene.name}>
      <Badge $color="#4e7ede" className="mr-1 px-2 py-1">
        {t('Gene')}
      </Badge>
      <span className="text-body">{gene.name}</span>
    </Indent>
  )
}

function OptionLabelGeneAndCds({ cds }: { gene: Gene; cds: Cds; isMenu?: boolean }) {
  const { t } = useTranslationSafe()
  return (
    <Indent title={cds.name}>
      <Badge $color="#4e7ede" className="mr-1 px-2 py-1">
        {t('Gene')}
      </Badge>
      <Badge $color="#846ab8" className="mr-1">
        {'CDS'}
      </Badge>
      <span>{cds.name}</span>
    </Indent>
  )
}

function OptionLabelCds({ cds, isMenu = false }: { cds: Cds; isMenu?: boolean }) {
  return (
    <Indent indent={isMenu && 1} title={cds.name}>
      <Badge $color="#846ab8" className="mr-1 px-2 py-1">
        {'CDS'}
      </Badge>
      <span>{cds.name}</span>
    </Indent>
  )
}

function OptionLabelProtein({ protein, isMenu = false }: { protein: Protein; isMenu?: boolean }) {
  const { t } = useTranslationSafe()
  return (
    <Indent indent={isMenu && 2} title={protein.name}>
      <Badge $color="#9c8668" className="mr-1">
        {t('Protein')}
      </Badge>
      <span className="text-body">{protein.name}</span>
    </Indent>
  )
}

const Badge = styled(BadgeBase)<{ $color?: string }>`
  background-color: ${(props) => props.$color ?? props.theme.gray600};
  font-size: 1rem;
`

const BadgeWide = styled(Badge)<{ $color?: string }>`
  width: 100%;
`

// noinspection CssReplaceWithShorthandSafely
const Indent = styled.div<{ indent?: number | boolean }>`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0;
  margin: 0;
  padding-left: ${(props) => ensureNumber(props.indent) * 0.8}rem;
`

function prepareOptions(genes: Gene[]) {
  const options: Option[] = [{ value: CDS_OPTION_NUC_SEQUENCE }]

  if (isEmpty(genes)) {
    return { options, defaultOption: options[0] }
  }

  const defaultCds = genes[0].cdses[0]
  let defaultOption: Option = {
    value: defaultCds.name,
    cds: defaultCds,
  }

  for (const gene of genes) {
    if (gene.cdses.length === 1) {
      options.push({
        value: `gene-${gene.name}`,
        gene,
        cds: gene.cdses[0],
      })
    } else {
      options.push({
        value: `gene-${gene.name}`,
        gene,
        isDisabled: true,
      })

          for (const cds of gene.cdses) {
        const option: Option = {
          value: `cds-${cds.name}`,
          cds,
        }
        defaultOption = option
        options.push(option)

              for (const protein of cds.proteins) {
          options.push({
            value: `protein-${protein.name}`,
            protein,
            isDisabled: true,
          })
        }
      }
    }
  }

  return { options, defaultOption }
}

const checkSearchCandidateEntry = (candidate: FilterOptionOption<Option>, searchTerm: string): boolean => {
  if (candidate.value === CDS_OPTION_NUC_SEQUENCE) {
    return true
  }

  const { gene, cds, protein } = candidate.data

  if (!isEmpty(searchTerm)) {
    return [
      gene?.name,
      cds?.name,
      protein?.name,
      ...(gene?.cdses.flatMap((cds) => cds.name) ?? []),
      ...(cds?.proteins.flatMap((protein) => protein.name) ?? []),
      ...(gene?.cdses.flatMap((cds) => cds.proteins.map((protein) => protein?.name)) ?? []),
    ]
      .filter(notUndefinedOrNull)
      .some((s) => checkSearchCandidateString(s, searchTerm))
  }
  return true
}

function checkSearchCandidateString(candidate: string | undefined, searchTerm: string): boolean {
  if (!candidate) {
    return false
  }
  return candidate
    .toLowerCase()
    .split(' ')
    .some((word) => word.includes(searchTerm.toLowerCase()))
}
