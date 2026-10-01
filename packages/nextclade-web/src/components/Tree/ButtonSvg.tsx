import { AuspiceState } from 'auspice'
import React, { useCallback, useMemo } from 'react'
import { FaDownload } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { publications } from 'auspice/src/components/download/downloadModal'
import { SVG } from 'auspice/src/components/download/helperFunctions'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'

export function ButtonSvg() {
  const { t } = useTranslationSafe()

  const colorBy = useSelector((state: AuspiceState) => state.controls?.colorBy)
  const metadata = useSelector((state: AuspiceState) => state.metadata)
  const nodes = useSelector((state: AuspiceState) => state.tree?.nodes)
  const visibility = useSelector((state: AuspiceState) => state.tree?.visibility)
  const panelsToDisplay = useSelector((state: AuspiceState) => state.controls?.panelsToDisplay)
  const panelLayout = useSelector((state: AuspiceState) => state.controls?.panelLayout)

  const dispatch = useDispatch()

  const relevantPublications = useMemo(() => {
    const relevantPublications = [
      {
        author: 'Aksamentov et al.',
        title: 'Nextclade: clade assignment, mutation calling and quality control for viral genomes',
        year: '2021',
        journal: 'Journal of Open Source Software, 6(67), 3773',
        href: 'https://doi.org/10.21105/joss.03773',
      },
      publications.nextstrain,
      publications.treetime,
    ]
    if (['cTiter', 'rb', 'ep', 'ne'].some((x) => !!colorBy?.includes(x))) {
      relevantPublications.push(publications.titers)
    }
    return relevantPublications
  }, [colorBy])

  const onClick = useCallback(
    () =>
      SVG(dispatch, t, metadata, nodes, visibility, 'nextclade', panelsToDisplay, panelLayout, relevantPublications),
    [dispatch, metadata, nodes, panelLayout, panelsToDisplay, relevantPublications, t, visibility],
  )

  return (
    <SvgButton type="button" onClick={onClick} title={t('Download a screenshot of the current page in SVG format')}>
      <FaDownload />
      {t('SVG')}
    </SvgButton>
  )
}

/** Colors of the Auspice tree buttons ("Zoom to Selected", "Zoom to Root") next to this button */
const AUSPICE_BUTTON = {
  color: '#333',
  iconColor: '#888',
  border: '#ccc',
}

/** Looks like the Auspice tree buttons: a tab hanging from the top of the tree card */
const SvgButton = styled.button`
  display: flex;
  flex: 0 0 auto;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border: 1px solid ${AUSPICE_BUTTON.border};
  border-top: none;
  border-radius: 0 0 3px 3px;
  background-color: #fff;
  color: ${AUSPICE_BUTTON.color};
  font-family: ${SIDEBAR_THEME['font-family']};
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
  text-transform: uppercase;
  cursor: pointer;

  /* Auspice button icons are thin outlines. A solid icon in the text color would look much heavier next to them */
  & > svg {
    width: 11px;
    height: 11px;
    color: ${AUSPICE_BUTTON.iconColor};
  }

  &:hover {
    background-color: #f5f5f5;
  }

  &:focus-visible {
    outline: 2px solid ${SIDEBAR_THEME.selectedColor};
    outline-offset: 1px;
  }
`
