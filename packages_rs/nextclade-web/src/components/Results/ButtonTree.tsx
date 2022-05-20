import React, { useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'

import { hasTreeAtom } from 'src/state/results.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { PanelButton } from 'src/components/Results/PanelButton'
import { TreeIcon } from 'src/components/Tree/TreeIcon'

const IconContainer = styled.span`
  margin-right: 0.5rem;
`

export function ButtonTree() {
  const { t } = useTranslationSafe()
  const router = useRouter()

  const text = useMemo(() => t('Show phylogenetic tree'), [t])
  const hasTree = useRecoilValue(hasTreeAtom)
  const showTree = useCallback(() => router.push('/tree'), [router])

  return (
    <PanelButton onClick={showTree} disabled={!hasTree} title={text}>
      <IconContainer>
        <TreeIcon />
      </IconContainer>
    </PanelButton>
  )
}
