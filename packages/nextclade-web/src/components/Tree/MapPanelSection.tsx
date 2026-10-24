import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { AuspiceState } from 'auspice'
import GeoResolution from 'auspice/src/components/controls/geo-resolution'
import { MapInfo } from 'auspice/src/components/controls/miscInfoText'
import { PanelSection } from 'auspice/src/components/controls/panelSection'
import { SidebarSubtitle } from 'auspice/src/components/controls/styles'
import styled from 'styled-components'
import { canDrawMaps } from 'src/helpers/canDrawMaps'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

/**
 * Toggle of the map of the locations in added metadata, which Auspice makes available when added metadata has
 * coordinates. Auspice shows no map next to a second tree
 */
export function MapPanelSection() {
  const { t } = useTranslationSafe()
  const isMapAvailable = useSelector((state: AuspiceState) => state.controls?.panelsAvailable?.includes('map'))
  const isSecondTreeShown = useSelector((state: AuspiceState) => !!state.controls?.showTreeToo)
  const isWebGlAvailable = useMemo(() => canDrawMaps(), [])

  if (!isMapAvailable || isSecondTreeShown) {
    return null
  }

  if (!isWebGlAvailable) {
    return (
      <Container>
        <SidebarSubtitle>{t('sidebar:Map')}</SidebarSubtitle>
        <Note>{t('This browser cannot draw maps, because WebGL is turned off or not supported.')}</Note>
      </Container>
    )
  }

  return (
    <Container>
      <PanelSection panel="map" title={t('sidebar:Map')} tooltip={MapInfo} options={<GeoResolution />} />
    </Container>
  )
}

const Container = styled.div`
  padding-top: 10px;
`

const Note = styled.p`
  margin: 5px 0 0 0;
  font-size: 12px;
  line-height: 1.3;
  opacity: 0.8;
`
