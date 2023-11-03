import qs from 'querystring'
import React, { useMemo } from 'react'
import { ErrorContainer, ErrorMessage } from 'src/components/Error/ErrorStyles'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { PROJECT_NAME, RELEASE_OLD_URL } from 'src/constants'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { NextcladeV2Error } from 'src/io/fetchSingleDatasetFromUrl'
import urljoin from 'url-join'

export interface Props {
  error: NextcladeV2Error
}

export function NextcladeV2ErrorContent({ error }: Props) {
  const { t } = useTranslationSafe()

  const oldUrl = useMemo(() => {
    const oldUrl = urljoin(RELEASE_OLD_URL)
    const params = qs.stringify({ 'dataset-url': error.datasetRootUrl })
    return `${oldUrl}?${params}`
  }, [error.datasetRootUrl])

  return (
    <ErrorContainer>
      <ErrorMessage>
        <h5>{t('Dataset file format not recognized.')}</h5>

        <p>
          {t("We tried to download a custom dataset requested using 'dataset-url' parameter from ")}
          <LinkExternal href={error.datasetRootUrl}>{error.datasetRootUrl}</LinkExternal>
          {t(
            ', however, we could not find necessary files. Instead, we found files which are specific to datasets for older version of {{project}}.',
            { project: PROJECT_NAME },
          )}
        </p>

        <p>
          {t(
            'It is likely that this dataset is out of date and is only suitable for earlier versions of {{project}}. Please reach out to dataset authors so that they could convert the dataset to the newer format. The procedure is explained in the project documentation.',
            { project: PROJECT_NAME },
          )}
        </p>

        <p>
          {t('In the meantime, you can try to run again using an older version of Nextclade: {{ lnk }}', { lnk: '' })}
          <LinkExternal href={oldUrl}>{oldUrl}</LinkExternal>
          {t('. ')}
          {t(
            'However, this is not recommended: this version of the application is no longer updated or supported, and we cannot guarantee that it will work, and that it will produce correct results.',
          )}
        </p>

        <p>
          {t(
            "If you did not mean to request a custom dataset, then remove the 'dataset-url' parameter from the URL or restart the application.",
          )}
        </p>
      </ErrorMessage>
    </ErrorContainer>
  )
}
