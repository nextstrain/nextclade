import React, { useCallback, useMemo } from 'react'
import { Button } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Layout } from 'src/components/Layout/Layout'
import { DEFAULT_EXPORT_PARAMS, useExportCsv, useExportTsv } from 'src/hooks/useExportResults'
import { useToggle } from 'src/hooks/useToggle'
import { ExportTabMain } from 'src/components/Export/ExportTabMain'
import { ExportTabColumnConfig } from 'src/components/Export/ExportTabColumnConfig'

export function ExportPage() {
  const { t } = useTranslationSafe()
  const [isColumnConfigOpen, toggleColumnConfigOpen] = useToggle(false)

  const exportParams = useMemo(() => DEFAULT_EXPORT_PARAMS, [])
  const exportCsv_ = useExportCsv() // eslint-disable-line no-underscore-dangle
  const exportTsv_ = useExportTsv() // eslint-disable-line no-underscore-dangle
  const exportCsv = useCallback(() => exportCsv_(exportParams.filenameCsv), [exportCsv_, exportParams.filenameCsv])
  const exportTsv = useCallback(() => exportTsv_(exportParams.filenameTsv), [exportParams.filenameTsv, exportTsv_])

  return (
    <Layout>
      <Container>
        <Header>
          <h4 className="mx-auto">{t('Download output files')}</h4>
        </Header>

        <Main>
          {isColumnConfigOpen ? (
            <ExportTabColumnConfig />
          ) : (
            <ExportTabMain toggleColumnConfigOpen={toggleColumnConfigOpen} />
          )}
        </Main>

        <Footer>
          {isColumnConfigOpen && (
            <div className="mr-auto p-3">
              <Button type="button" className="mx-1" onClick={toggleColumnConfigOpen} title={t('Back to Downloads')}>
                {t('Back to Downloads')}
              </Button>

              <Button type="button" color="success" className="mx-1" onClick={exportCsv} title={t('Download CSV')}>
                {t('Download CSV')}
              </Button>

              <Button type="button" color="primary" className="mx-1" onClick={exportTsv} title={t('Download TSV')}>
                {t('Download TSV')}
              </Button>
            </div>
          )}
        </Footer>
      </Container>
    </Layout>
  )
}

const Container = styled.div`
  max-width: ${(props) => props.theme.containerMaxWidths.md};
  margin: 0 auto;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`
