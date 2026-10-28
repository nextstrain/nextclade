import React from 'react'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ShowOnTreeTooltipProps {
  /** Title of the tooltip: what the button shows on the tree */
  label: string
  /** What a click, a Shift+click and a zooming click do with the shown target */
  actions: ShowOnTreeActions
  /** Whether a click zooms the tree, as Settings > Tree says */
  shouldZoom: boolean
  /** Note after the note about the zoom, e.g. how to hide the button */
  note?: string
}

/** What the clicks of a "show on tree" button do, in the words of its target */
export interface ShowOnTreeActions {
  /** Action of a click, e.g. "Select only this sequence" */
  click: string
  /** Action of a Shift+click, e.g. "Add this sequence to the selected sequences" */
  shiftClick: string
  /** Action of a click that zooms, e.g. "Zoom to the selected sequences" */
  zoom: string
  /** Note for the case that a click zooms, e.g. "A click zooms to the selected sequences. You can change this in..." */
  zoomNote: string
}

/** Tooltip of a "show on tree" button, which lists what a click with each modifier key does */
export function ShowOnTreeTooltip({ label, actions, shouldZoom, note }: ShowOnTreeTooltipProps) {
  const { t } = useTranslationSafe()
  return (
    <>
      <TooltipTitle>{label}</TooltipTitle>
      <ClickTable>
        <tbody>
          <tr>
            <th>{t('Click')}</th>
            <td>{actions.click}</td>
          </tr>
          <tr>
            <th>{t('Shift+click')}</th>
            <td>{actions.shiftClick}</td>
          </tr>
          <tr>
            <th>{t('Alt+click')}</th>
            <td>{shouldZoom ? t('Keep the zoom of the tree') : actions.zoom}</td>
          </tr>
        </tbody>
      </ClickTable>
      <TooltipNote>
        {shouldZoom
          ? actions.zoomNote
          : t('A click keeps the zoom of the tree. You can change this in Settings > Tree.')}
      </TooltipNote>
      {note ? <TooltipNote>{note}</TooltipNote> : null}
    </>
  )
}

const TooltipTitle = styled.p`
  margin-bottom: 0.5rem;
  font-weight: bold;
  overflow-wrap: anywhere;
`

const ClickTable = styled.table`
  margin-bottom: 0.5rem;

  & th {
    padding-right: 1rem;
    white-space: nowrap;
  }
`

const TooltipNote = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${(props) => props.theme.gray600};

  & + & {
    margin-top: 0.25rem;
  }
`
