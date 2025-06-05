import React from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { InfoButton } from 'src/components/Common/InfoButton'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function TabSingleDatasetHelp() {
  const { t } = useTranslationSafe()

  return (
    <InfoButton>
      <p>
        {t(
          'In single-dataset mode all sequences are analyzed using the same dataset. A dataset can be selected manually by clicking on "Select reference dataset" or "Change reference dataset" buttons. Nextclade can also suggest the most appropriate dataset from your sequences.',
        )}
      </p>

      <p>
        {t(
          'If no dataset is currently selected, drag and drop some sequence data and click "Suggest" button to launch the suggestion algorithm. Click "Re-suggest" if there is already a dataset selected. You can clear current selection by clicking "Reset" button. ',
        )}
      </p>

      <p>
        {t(
          'In single-dataset mode all sequences are analyzed using the same dataset. A dataset can be selected manually by clicking on "Select reference dataset" or "Change reference dataset" buttons. Nextclade can also suggest the most appropriate dataset from your sequences.',
        )}
      </p>

      <p>
        {t(
          'If there is no current selection and if the "Suggest automatically" toggle is enabled (green), then dataset suggestion runs automatically once sequence data is provided and suggested dataset is selected automatically. Automatic suggestion will not override your selected dataset, but might warn you if the selected dataset does not match the sequences provided.',
        )}
      </p>

      <p className="p-0 m-0 small">
        {t('Learn more about datasets in Nextclade {{documentation}}')}
        <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable">
          {t('documentation')}
        </LinkExternal>
      </p>
    </InfoButton>
  )
}
