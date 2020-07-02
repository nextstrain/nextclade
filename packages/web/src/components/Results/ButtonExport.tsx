import React, { useState } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button as ReactstrapButton, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import { IoMdDocument } from 'react-icons/io'
import { BsBraces } from 'react-icons/bs'

import type { State } from 'src/state/reducer'
import { ExportFormat } from 'src/state/ui/ui.state'
import { exportCsvTrigger, exportJsonTrigger } from 'src/state/algorithm/algorithm.actions'
import { setExportFormat } from 'src/state/ui/ui.actions'
import { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import styled from 'styled-components'

const Button = styled(ReactstrapButton)`
  width: 225px;
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
  exportJsonTrigger(_0: void): void
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
  setExportFormat,
}

export const ButtonExport = connect(mapStateToProps, mapDispatchToProps)(ExportButtonDisconnected)

export function ExportButtonDisconnected({
  canExport,
  exportFormat,
  setExportFormat,
  exportCsvTrigger,
  exportJsonTrigger,
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

  const handleButtonClick = exportFormat === ExportFormat.JSON ? handleJsonClick : handleCsvClick

  return (
    <ButtonDropdown isOpen={isOpen} toggle={toggle} disabled={!canExport}>
      <Button id="caret" color="primary" disabled={!canExport} onClick={handleButtonClick}>
        {exportFormat === ExportFormat.JSON ? <ExportJSONIcon /> : <ExportCSVIcon />}
        {t('Export to {{exportFormat}}', { exportFormat })}
      </Button>
      <DropdownToggle color="primary" caret disabled={!canExport} />
      <DropdownMenu>
        <DropdownItem onClick={handleCsvClick}>
          <ExportCSVIcon />
          {t('Export to CSV')}
        </DropdownItem>
        <DropdownItem onClick={handleJsonClick}>
          <ExportJSONIcon />
          {t('Export to JSON')}
        </DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  )
}
