import React from 'react'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { FilePickerAdvanced } from 'src/components/FilePicker/FilePickerAdvanced'

export function DatasetContentTabAdvanced() {
  const { t } = useTranslationSafe()
  return (
    <Container>
      <Header>
        <AdvancedModeExplanationWrapper>
          <p>
            {t(
              'Here you can override individual files in the dataset. If a file is not provided, it will be substituted from the currently selected dataset. Learn more in the {{documentation}}',
              { documentation: '' },
            )}
            <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable/">
              {t('documentation')}
            </LinkExternal>
          </p>
        </AdvancedModeExplanationWrapper>
      </Header>

      <Main>
        <FilePickerAdvanced />
      </Main>
    </Container>
  )
}

export const AdvancedModeExplanationWrapper = styled.div`
  > p {
    margin: 0;
  }
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.div`
  flex: 0;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
  width: 100%;
`
