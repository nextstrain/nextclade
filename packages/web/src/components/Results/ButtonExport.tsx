import React, { useState } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button as ReactstrapButton, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import { IoMdDocument } from 'react-icons/io'
import { BsBraces } from 'react-icons/bs'

import type { State } from 'src/state/reducer'
import { ExportFormat } from 'src/state/ui/ui.state'
import {
  exportAuspiceJsonV2Trigger,
  exportCsvTrigger,
  exportTsvTrigger,
  exportJsonTrigger,
} from 'src/state/algorithm/algorithm.actions'
import { setExportFormat } from 'src/state/ui/ui.actions'
import { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import styled from 'styled-components'

const Button = styled(ReactstrapButton)`
  width: 225px;
  margin: 0;
`

export function ExportJSONIcon() {
  return <BsBraces className="mr-2 mb-1" size={22} />
}

export function ExportCSVIcon() {
  return <IoMdDocument className="mr-2 mb-1" size={22} />
}

export interface ExportButtonIconProps {
  exportFormat: ExportFormat
}

export interface ExportButtonProps {
  canExport: boolean
  exportFormat: ExportFormat
  setExportFormat(exportType: ExportFormat): void
  exportCsvTrigger(_0: void): void
  exportTsvTrigger(_0: void): void
  exportJsonTrigger(_0: void): void
  exportAuspiceJsonV2Trigger(_0: void): void
}

const mapStateToProps = (state: State) => ({
  exportFormat: state.ui.exportFormat,
  canExport:
    state.algorithm.results.length > 0 &&
    state.algorithm.results.every(
      (result) => result.status === AnylysisStatus.done || result.status === AnylysisStatus.failed,
    ),
})

const mapDispatchToProps = {
  exportCsvTrigger,
  exportJsonTrigger,
  exportTsvTrigger,
  exportAuspiceJsonV2Trigger,
  setExportFormat,
}

export const ButtonExport = connect(mapStateToProps, mapDispatchToProps)(ExportButtonDisconnected)

export function ExportButtonDisconnected({
  canExport,
  exportFormat,
  setExportFormat,
  exportCsvTrigger,
  exportTsvTrigger,
  exportJsonTrigger,
  exportAuspiceJsonV2Trigger,
}: ExportButtonProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const toggle = () => setIsOpen(!isOpen)

  const handleJsonClick = () => {
    setExportFormat(ExportFormat.JSON)
    exportJsonTrigger()
  }

  const handleCsvClick = () => {
    setExportFormat(ExportFormat.CSV)
    exportCsvTrigger()
  }

  const handleTsvClick = () => {
    setExportFormat(ExportFormat.TSV)
    exportTsvTrigger()
  }

  const handleAuspiceJsonClick = () => {
    setExportFormat(ExportFormat.AuspiceJSONv2)
    exportAuspiceJsonV2Trigger()
  }

  const handleButtonClick = exportFormat === ExportFormat.CSV ? handleCsvClick : handleJsonClick

  return (
    <ButtonDropdown isOpen={isOpen} toggle={toggle} disabled={!canExport}>
      <Button id="caret" color="primary" disabled={!canExport} onClick={handleButtonClick}>
        {exportFormat === ExportFormat.CSV ? <ExportCSVIcon /> : <ExportJSONIcon />}
        {t('Export to {{exportFormat}}', { exportFormat })}
      </Button>
      <DropdownToggle color="primary" caret disabled={!canExport} />
      <DropdownMenu>
        <DropdownItem onClick={handleCsvClick}>
          <ExportCSVIcon />
          {t('Export to CSV')}
        </DropdownItem>
        <DropdownItem onClick={handleTsvClick}>
          <ExportCSVIcon />
          {t('Export to TSV')}
        </DropdownItem>
        <DropdownItem onClick={handleJsonClick}>
          <ExportJSONIcon />
          {t('Export to JSON')}
        </DropdownItem>
        <DropdownItem onClick={handleAuspiceJsonClick}>
          <ExportJSONIcon />
          {t('Export to Auspice JSON v2')}
        </DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  )
}
