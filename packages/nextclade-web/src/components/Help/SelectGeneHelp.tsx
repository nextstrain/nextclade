import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function SelectGeneHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton color="link">
      <p>{t('Select genetic feature.')}</p>

      <p>{t('This allows to...')}</p>

      <p>
        {t(
          'You can select one of the datasets manually or to use automatic dataset suggestion function. Automatic suggestion will attempt to guess the most appropriate dataset from your sequence data.',
        )}
      </p>

      <p>
        {t('Learn more in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
        {t('.')}
      </p>
    </InfoButton>
  )
}
