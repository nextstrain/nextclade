import { AuspiceState } from 'auspice'
import React, { useCallback, useMemo } from 'react'
import { FaDownload } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { publications } from 'auspice/src/components/download/downloadModal'
import { SVG } from 'auspice/src/components/download/helperFunctions'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
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
    <SvgButton onClick={onClick} title={t('Download a screenshot of the current page in SVG format')}>
      <SvgButtonContent>
        <FaDownload fill="#aaa" />
        <span className="pl-1">{t('SVG')}</span>
      </SvgButtonContent>
    </SvgButton>
  )
}

const SvgButton = styled(ButtonTransparent)`
  height: 16px;
  margin: auto 0.5rem;
  margin-right: 22px;
`

const SvgButtonContent = styled.div`
  display: flex;
  align-items: center;
  color: #aaa;
`
