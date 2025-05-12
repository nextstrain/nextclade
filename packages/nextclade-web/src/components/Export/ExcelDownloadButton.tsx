import React, { useCallback, useMemo } from 'react'
import { Button, Spinner as SpinnerBase } from 'reactstrap'
import styled from 'styled-components'
import { DEFAULT_EXPORT_PARAMS, useExportExcel } from 'src/hooks/useExportResults'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { RiFileExcel2Fill } from 'react-icons/ri'
import { MdFileDownloadDone } from 'react-icons/md'

export function ExcelDownloadLink() {
  const { t } = useTranslationSafe()
  const { isRunning, isDone, fn: exportExcel } = useExportExcel()
  const onClick = useCallback(() => exportExcel(DEFAULT_EXPORT_PARAMS.filenameExcel), [exportExcel])

  const icon = useMemo(() => {
    if (isRunning) {
      return <Spinner />
    }
    if (isDone) {
      return <SuccessIcon size="15px" color="#1d6f42" />
    }
    return <RiFileExcel2Fill fill="#1d6f42" />
  }, [isDone, isRunning])

  return (
    <Button color="secondary" onClick={onClick} disabled={isRunning}>
      <span className="mr-1 my-auto">{icon}</span>
      <span>{t('Export all to Excel')}</span>
    </Button>
  )
}

const Spinner = styled(SpinnerBase)`
  width: 15px;
  height: 15px;
  margin: auto;
`

const SuccessIcon = styled(MdFileDownloadDone)``
