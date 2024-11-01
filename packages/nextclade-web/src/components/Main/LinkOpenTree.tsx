import classNames from 'classnames'
import type { Dataset } from 'src/types'
import React, { HTMLProps, useMemo } from 'react'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import urljoin from 'url-join'

export interface LinkOpenTreeProps extends HTMLProps<HTMLDivElement> {
  dataset: Dataset
}

export function LinkOpenTree({ dataset }: LinkOpenTreeProps) {
  const { t } = useTranslationSafe()
  const nextstrainOrgTreeUrl = useMemo(() => {
    if (!dataset.files?.treeJson) {
      return undefined
    }
    const path = dataset.files.treeJson.replace(/^https?:\/\//, '')
    return urljoin('https://nextstrain.org/fetch', path)
  }, [dataset.files?.treeJson])

  const title = useMemo(
    () =>
      nextstrainOrgTreeUrl
        ? t('Open reference tree for this dataset on nextstrain.org')
        : t('There is no reference tree in this dataset'),
    [nextstrainOrgTreeUrl, t],
  )

  return (
    <LinkContainer className="mx-2">
      <LinkExternalStyled
        className={classNames(!nextstrainOrgTreeUrl && 'disabled')}
        title={title}
        href={nextstrainOrgTreeUrl}
      >
        {t('Open tree')}
      </LinkExternalStyled>
    </LinkContainer>
  )
}

const LinkContainer = styled.div`
  margin: auto 0;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LinkExternalStyled = styled(LinkExternal)`
  white-space: nowrap;

  &.disabled {
    color: #7b838a !important;
    opacity: 0.65 !important;
    text-decoration: none;
    cursor: not-allowed !important;
    transition: none !important;
  }

  transition: none !important;
`
