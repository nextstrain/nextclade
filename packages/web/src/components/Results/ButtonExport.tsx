import React, { useState } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Button as ReactstrapButton,
  ButtonDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle as ReactstrapDropdownToggle,
} from 'reactstrap'
import { IoMdDocument } from 'react-icons/io'
import { BsBraces } from 'react-icons/bs'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import { ExportFormat } from 'src/state/ui/ui.state'
import { exportCsvTrigger, exportTsvTrigger, exportJsonTrigger } from 'src/state/algorithm/algorithm.actions'
import { setExportFormat } from 'src/state/ui/ui.actions'
import { selectCanExport } from 'src/state/algorithm/algorithm.selectors'

const Button = styled(ReactstrapButton)`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  margin-right: 0;

  @media (min-width: 1200px) {
    width: 225px;
  }
`

const DropdownToggle = styled(ReactstrapDropdownToggle)`
  margin: 2px 0;
  height: 38px;
`

export function ExportJSONIcon() {
  return <BsBraces className="mr-xl-2 mb-1" size={22} />
}

export function ExportCSVIcon() {
  return <IoMdDocument className="mr-xl-2 mb-1" size={22} />
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
}

const mapStateToProps = (state: State) => ({
  exportFormat: state.ui.exportFormat,
  canExport: selectCanExport(state),
})

const mapDispatchToProps = {
  exportCsvTrigger,
  exportJsonTrigger,
  exportTsvTrigger,
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

  const handleButtonClick = exportFormat === ExportFormat.CSV ? handleCsvClick : handleJsonClick

  const text = t('Export to {{exportFormat}}', { exportFormat })

  return (
    <ButtonDropdown isOpen={isOpen} toggle={toggle} disabled={!canExport} title={text}>
      <Button id="caret" disabled={!canExport} onClick={handleButtonClick} title={text}>
        {exportFormat === ExportFormat.CSV ? <ExportCSVIcon /> : <ExportJSONIcon />}
        <span className="d-none d-xl-inline">{text}</span>
      </Button>
      <DropdownToggle caret disabled={!canExport} />
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
      </DropdownMenu>
    </ButtonDropdown>
  )
}
