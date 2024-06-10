import styled from 'styled-components'
import { rgba } from 'polished'

import { ButtonHelp } from 'src/components/Results/ButtonHelp'

export const ROW_HEIGHT = 30

export const HEADER_ROW_HEIGHT = 90

export const HEADER_ROW_CONTENT_HEIGHT = 65

export const DYNAMIC_CLADE_COLUMN_WIDTH = 85
export const DYNAMIC_PHENOTYPE_COLUMN_WIDTH = 65
export const DYNAMIC_AA_MOTIFS_COLUMN_WIDTH = 85

export const COLUMN_WIDTHS = {
  rowIndex: 45,
  id: 45,
  seqName: 250,
  qc: 130,
  clade: 110,
  coverage: 50,
  mut: 50,
  nonACGTN: 60,
  ns: 50,
  gaps: 50,
  insertions: 50,
  frameShifts: 50,
  stopCodons: 50,
  sequenceView: 550,
} as const

export const Table = styled.div<{ rounded?: boolean }>`
  font-size: 0.8rem;
  width: 100%;
  height: 100%;
  background-color: #b3b3b3aa;
  overflow: hidden;
  transition: border-radius 250ms linear;
`

export const TableHeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  height: ${HEADER_ROW_HEIGHT}px;
  overflow-y: scroll;
  overflow-x: hidden;
  background-color: #495057;
  color: #e7e7e7;
`

export const TableHeaderCell = styled.div<{ basis?: string; grow?: number; shrink?: number; first?: boolean }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  border-left: ${(props) => !props.first && `1px solid #b3b3b3aa`};
  overflow: hidden;
  width: 100%;
`

export const TableHeaderCellContent = styled.div`
  height: ${HEADER_ROW_CONTENT_HEIGHT}px;
  display: flex;
`

export const TableCellText = styled.p`
  text-align: center;
  margin: auto;
`

export const TableRow = styled.div<{ backgroundColor?: string }>`
  display: flex;
  align-items: stretch;
  background-color: ${(props) => props.backgroundColor};
  box-shadow: 1px 2px 2px 2px ${rgba('#212529', 0.25)};
`

export const TableCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  border-left: 1px solid #b3b3b3;
`

export const TableCellRowIndex = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  background-color: #495057;
  color: #e7e7e7;
  border-top: 1px solid #b3b3b3aa;
  height: calc(100% - 1px);
`

export const TableCellName = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

export const TableCellAlignedLeft = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

export const TableRowPending = styled(TableRow)`
  background-color: #d2d2d2;
  color: #818181;
`

export const TableRowError = styled(TableRow)`
  background-color: #f0a9a9;
  color: #962d26;
`

export const ButtonHelpStyled = styled(ButtonHelp)`
  display: block;
`
