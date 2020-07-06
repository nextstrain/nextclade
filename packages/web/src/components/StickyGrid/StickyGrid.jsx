import React, { createContext, forwardRef } from 'react'
import { render } from 'react-dom'
import { FixedSizeGrid as Grid } from 'react-window'

import './styles.css'

const getRenderedCursor = (children) =>
  children.reduce(
    ([minRow, maxRow, minColumn, maxColumn], { props: { columnIndex, rowIndex } }) => {
      if (rowIndex < minRow) {
        minRow = rowIndex
      }
      if (rowIndex > maxRow) {
        maxRow = rowIndex
      }
      if (columnIndex < minColumn) {
        minColumn = columnIndex
      }
      if (columnIndex > maxColumn) {
        maxColumn = columnIndex
      }

      return [minRow, maxRow, minColumn, maxColumn]
    },
    [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
  )

const headerBuilder = (minColumn, maxColumn, columnWidth, stickyHeight) => {
  const columns = []

  for (let i = minColumn; i <= maxColumn; i++) {
    columns.push({
      height: stickyHeight,
      width: columnWidth,
      left: i * columnWidth,
      label: `Sticky Col ${i}`,
    })
  }

  return columns
}

const columnsBuilder = (minRow, maxRow, rowHeight, stickyWidth) => {
  const rows = []

  for (let i = minRow; i <= maxRow; i++) {
    rows.push({
      height: rowHeight,
      width: stickyWidth,
      top: i * rowHeight,
      label: `Sticky Row ${i}`,
    })
  }

  return rows
}

const GridColumn = ({ rowIndex, columnIndex, style }) => {
  return (
    <div className="sticky-grid__data__column" style={style}>
      Cell {rowIndex}, {columnIndex}
    </div>
  )
}

const StickyHeader = ({ stickyHeight, stickyWidth, headerColumns }) => {
  const baseStyle = {
    height: stickyHeight,
    width: stickyWidth,
  }
  const scrollableStyle = { left: stickyWidth }

  return (
    <div className="sticky-grid__header">
      <div className="sticky-grid__header__base" style={baseStyle}>
        Sticky Base
      </div>
      <div className="sticky-grid__header__scrollable" style={scrollableStyle}>
        {headerColumns.map(({ label, ...style }, i) => (
          <div className="sticky-grid__header__scrollable__column" style={style} key={i}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

const StickyColumns = ({ rows, stickyHeight, stickyWidth }) => {
  const leftSideStyle = {
    top: stickyHeight,
    width: stickyWidth,
    height: `calc(100% - ${stickyHeight}px)`,
  }

  return (
    <div className="sticky-grid__sticky-columns__container" style={leftSideStyle}>
      {rows.map(({ label, ...style }, i) => (
        <div className="sticky-grid__sticky-columns__row" style={style} key={i}>
          {label}
        </div>
      ))}
    </div>
  )
}

const StickyGridContext = createContext()
StickyGridContext.displayName = 'StickyGridContext'

const innerGridElementType = forwardRef(({ children, ...rest }, ref) => (
  <StickyGridContext.Consumer>
    {({ stickyHeight, stickyWidth, headerBuilder, columnsBuilder, columnWidth, rowHeight }) => {
      const [minRow, maxRow, minColumn, maxColumn] = getRenderedCursor(children) // TODO maybe there is more elegant way to get this
      const headerColumns = headerBuilder(minColumn, maxColumn, columnWidth, stickyHeight)
      const leftSideRows = columnsBuilder(minRow, maxRow, rowHeight, stickyWidth)
      const containerStyle = {
        ...rest.style,
        width: `${parseFloat(rest.style.width) + stickyWidth}px`,
        height: `${parseFloat(rest.style.height) + stickyHeight}px`,
      }
      const containerProps = { ...rest, style: containerStyle }
      const gridDataContainerStyle = { top: stickyHeight, left: stickyWidth }

      return (
        <div className="sticky-grid__container" ref={ref} {...containerProps}>
          <StickyHeader headerColumns={headerColumns} stickyHeight={stickyHeight} stickyWidth={stickyWidth} />
          <StickyColumns rows={leftSideRows} stickyHeight={stickyHeight} stickyWidth={stickyWidth} />

          <div className="sticky-grid__data__container" style={gridDataContainerStyle}>
            {children}
          </div>
        </div>
      )
    }}
  </StickyGridContext.Consumer>
))

const StickyGrid = ({ stickyHeight, stickyWidth, columnWidth, rowHeight, children, ...rest }) => (
  <StickyGridContext.Provider
    value={{
      stickyHeight,
      stickyWidth,
      columnWidth,
      rowHeight,
      headerBuilder,
      columnsBuilder,
    }}
  >
    <Grid columnWidth={columnWidth} rowHeight={rowHeight} innerElementType={innerGridElementType} {...rest}>
      {children}
    </Grid>
  </StickyGridContext.Provider>
)
