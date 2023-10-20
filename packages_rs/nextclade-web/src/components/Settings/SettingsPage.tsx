import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Button, ButtonProps } from 'reactstrap'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { SeqViewSettings } from 'src/components/Settings/SeqViewSettings'
import { SystemSettings } from 'src/components/Settings/SystemSettings'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TabContent, TabLabel, TabNav, TabPane } from 'src/components/Common/TabsFull'

export function SettingsPage() {
  const { t } = useTranslationSafe()
  const { back, asPath } = useRouter()
  const [activeTabId, setActiveTabId] = useState(asPath.split('#')[1] ?? 'general')

  return (
    <Layout>
      <Container>
        <Header>
          <h3>{t('Settings')}</h3>
        </Header>

        <Main>
          <TabNav>
            <TabLabel href="#general" tabId="general" activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
              {t('General')}
            </TabLabel>
            <TabLabel
              href="#sequence-view"
              tabId="sequence-view"
              activeTabId={activeTabId}
              setActiveTabId={setActiveTabId}
            >
              {t('Sequence view')}
            </TabLabel>
          </TabNav>

          <TabContent activeTab={activeTabId}>
            <TabPane tabId="general">
              <SystemSettings />
            </TabPane>
            <TabPane tabId="sequence-view">
              <SeqViewSettings />
            </TabPane>
          </TabContent>
        </Main>

        <Footer>
          <ButtonOk className="m-2 ml-auto" type="button" color="success" onClick={back}>
            {t('OK')}
          </ButtonOk>
        </Footer>
      </Container>
    </Layout>
  )
}

const Container = styled.div`
  max-width: ${(props) => props.theme.containerMaxWidths.md};
  margin: 0 auto;
  padding: 0.8rem 0;
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

const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
`
