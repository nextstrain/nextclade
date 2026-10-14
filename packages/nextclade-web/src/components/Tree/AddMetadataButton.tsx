import React, { ChangeEvent, useCallback, useRef } from 'react'
import { FaPlus } from 'react-icons/fa'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'
import { addMetadataFiles, METADATA_FILE_ACCEPT } from 'src/components/Tree/treeMetadataFiles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

/**
 * Button in the sidebar that adds metadata files to the tree, the same as dropping them on the tree. Their columns
 * become colorings and filters of the tree
 */
export function AddMetadataButton() {
  const { t } = useTranslationSafe()
  const dispatch = useDispatch()
  const inputRef = useRef<HTMLInputElement>(null)

  const openFilePicker = useCallback(() => inputRef.current?.click(), [])

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      // Allow adding the same file again, e.g. after editing it
      event.target.value = ''
      if (files.length > 0) {
        void dispatch(addMetadataFiles(files))
      }
    },
    [dispatch],
  )

  const title = t(
    'Color and filter the tree by the columns of CSV or TSV files, whose first column holds the sequence names. You can also drop the files on the tree.',
  )

  return (
    <>
      <Button type="button" onClick={openFilePicker} title={title}>
        <FaPlus />
        {t('Add metadata')}
      </Button>
      <input ref={inputRef} type="file" accept={METADATA_FILE_ACCEPT} multiple hidden onChange={onChange} />
    </>
  )
}

/** Text button in the style of the Auspice sidebar buttons (e.g. of the panel layout) */
const Button = styled.button`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 5px;
  margin: 0 0 10px 0;
  padding: 2px 0;
  border: none;
  background: none;
  color: ${SIDEBAR_THEME.selectedColor};
  font-family: ${SIDEBAR_THEME['font-family']};
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  cursor: pointer;

  & > svg {
    width: 10px;
    height: 10px;
  }

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${SIDEBAR_THEME.selectedColor};
    outline-offset: 2px;
  }
`
