import React, { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useRecoilValue } from 'recoil'
import type { AuspiceState } from 'auspice'
import CustomSelect from 'auspice/src/components/controls/customSelect'
import { SidebarSubtitle } from 'auspice/src/components/controls/styles'
import ToggleTangle from 'auspice/src/components/controls/toggle-tangle'
import { controlsWidth } from 'auspice/src/util/globals'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { hideSecondTree, showSecondTree } from 'src/state/auspice/auspice.actions'
import { datasetsForAnalysisAtom } from 'src/state/dataset.state'
import { allTreesAtom } from 'src/state/results.state'
import { useAuspiceDispatch } from 'src/state/store'
import { attrStrMaybe } from 'src/types'

const NO_SECOND_TREE = ''

interface SecondTreeOption {
  value: string
  label: string
}

/**
 * Choose another tree of the analysis to draw next to the tree of the viewed dataset, with lines between tips of the
 * same name, so that the user compares where samples are placed in both trees. Shown when the analysis has more than
 * one tree
 */
export function ChooseSecondTree() {
  const { t } = useTranslationSafe()
  const dispatch = useAuspiceDispatch()
  const { effectiveDatasetPath } = useEffectiveDataset()
  const datasets = useRecoilValue(datasetsForAnalysisAtom)
  const trees = useRecoilValue(allTreesAtom)
  const secondTreeName = useSelector((state: AuspiceState) => state.controls?.showTreeToo)
  const numLinkedTips = useSelector((state: AuspiceState) => state.treeToo?.tangleTipLookup?.length)

  const options = useMemo((): SecondTreeOption[] => {
    const otherTrees = (datasets ?? [])
      .filter(({ path }) => path !== effectiveDatasetPath && trees.get(path))
      .map((dataset) => ({ value: dataset.path, label: attrStrMaybe(dataset.attributes, 'name') ?? dataset.path }))
    return otherTrees.length > 0 ? [{ value: NO_SECOND_TREE, label: t('None') }, ...otherTrees] : []
  }, [datasets, effectiveDatasetPath, t, trees])

  const selected = useMemo(
    () => options.filter(({ value }) => value === (secondTreeName || NO_SECOND_TREE)),
    [options, secondTreeName],
  )

  const onChange = useCallback(
    (option: SecondTreeOption | null) => {
      const secondTree = option ? trees.get(option.value) : undefined
      if (!secondTree || !effectiveDatasetPath || !option) {
        dispatch(hideSecondTree())
        return
      }
      dispatch(showSecondTree(secondTree, effectiveDatasetPath, option.value))
    },
    [dispatch, effectiveDatasetPath, trees],
  )

  if (options.length === 0) {
    return null
  }

  return (
    <Container>
      <SidebarSubtitle>{t('Second tree')}</SidebarSubtitle>
      <SelectContainer>
        <CustomSelect
          aria-label={t('Second tree')}
          value={selected}
          options={options}
          isClearable={false}
          isSearchable={false}
          isMulti={false}
          onChange={onChange}
        />
      </SelectContainer>
      <Explanation>
        {t(
          'Draws another tree of this analysis next to this one, with lines between tips of the same name, to compare where samples are placed.',
        )}
      </Explanation>
      {secondTreeName && (
        <>
          <ToggleTangle />
          <Explanation>
            {numLinkedTips
              ? t('{{n}} visible tips are linked by name', { n: numLinkedTips })
              : t(
                  'The trees share no visible tip names. Tips are linked only when their names are the same, for example when the sequences of the segments of one sample have the same name.',
                )}
          </Explanation>
        </>
      )}
    </Container>
  )
}

const Container = styled.div`
  padding-top: 5px;
`

const SelectContainer = styled.div`
  width: ${controlsWidth}px;
  font-size: 14px;
`

const Explanation = styled.p`
  margin: 5px 0 0 0;
  font-size: 12px;
  line-height: 1.3;
  opacity: 0.8;
`
