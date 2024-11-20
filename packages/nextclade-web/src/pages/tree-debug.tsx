import type { AuspiceJsonV2 } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'
import React from 'react'
import dynamic from 'next/dynamic'
import { useDispatch } from 'react-redux'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'
import { useAxiosQuery } from 'src/helpers/useAxiosQuery'
import { auspiceStartClean } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'

const TreePageContent = dynamic(() => import('src/components/Tree/TreePageContent'), {
  ssr: false,
  loading() {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{LOADING}</>
  },
})

export default function TreePage() {
  const auspiceJson: AuspiceJsonV2 = useAxiosQuery(
    'https://raw.githubusercontent.com/nextstrain/nextclade_data/refs/heads/master/data/nextstrain/sars-cov-2/wuhan-hu-1/orfs/tree.json',
  )

  const dispatch = useDispatch()
  const auspiceState = createAuspiceState(auspiceJson, dispatch)
  dispatch(auspiceStartClean(auspiceState))
  dispatch(changeColorBy())
  // dispatch(treeFilterByNodeType(['New']))

  return (
    <Layout>
      <TreePageContent />
    </Layout>
  )
}
