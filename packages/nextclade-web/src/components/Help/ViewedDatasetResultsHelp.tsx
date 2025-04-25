import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function ViewedDatasetResultsHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton>
      <p>{t('Here you can select a dataset for which you want to display the analysis results.')}</p>

      <p>{t('Results for each dataset are obtained independently. Each sequence belongs to one of the datasets.')}</p>

      <p className="p-0 m-0 small">
        {t('Learn more in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
      </p>
    </InfoButton>
  )
}
