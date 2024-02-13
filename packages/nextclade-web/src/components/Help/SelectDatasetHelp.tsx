import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function SelectDatasetHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton>
      <p>
        {t(
          'Nextclade software is built to be agnostic to pathogens it analyzes. The information about concrete pathogens is provided in the form of so-called Nextclade datasets.',
        )}
      </p>

      <p>
        {t(
          'Datasets vary by the pathogen, strain and other attributes. Each dataset is based on a particular reference sequence. Certain datasets only have enough information for basic analysis, others - more information to allow for more in-depth analysis and checks. Dataset authors periodically update and improve their datasets.',
        )}
      </p>

      <p>
        {t(
          'You can select one of the datasets manually or to use automatic dataset suggestion function. Automatic suggestion will attempt to guess the most appropriate dataset from your sequence data.',
        )}
      </p>

      <p>
        {t(
          "If you don't find a dataset for a pathogen or a strain you need, then you can create your own dataset. You can also publish it to our community collection, so that other people can use it too.",
        )}
      </p>

      <p>
        {t('Learn more about Nextclade datasets in the {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable/user/datasets.html">
          {t('documentation')}
        </LinkExternal>
        {t('.')}
      </p>
    </InfoButton>
  )
}
