import React, { useMemo } from 'react'
import styled from 'styled-components'

import { ErrorContainer, ErrorMessage } from 'src/components/Error/ErrorStyles'
import {
  ERROR_INTERNAL_WASM,
  ERROR_WASM_OUT_OF_MEMORY,
  ERROR_WASM_UNKNOWN,
  FatalWasmErrorName,
} from 'src/helpers/ErrorWasm'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

/** Error after which the WebAssembly instance is broken: out of memory, panic, or other trap */
export function ErrorWasmFatal({ name, message }: { name: FatalWasmErrorName; message: string }) {
  const { t } = useTranslationSafe()

  const heading = useMemo(() => {
    const headings: Record<FatalWasmErrorName, string> = {
      [ERROR_WASM_OUT_OF_MEMORY]: t('Out of memory'),
      [ERROR_INTERNAL_WASM]: t('Internal error'),
      [ERROR_WASM_UNKNOWN]: t('Internal error'),
    }
    return headings[name]
  }, [name, t])

  return (
    <ErrorContainer>
      <ErrorWasmMessageBox as="div">
        <h5>{heading}</h5>
        <ErrorWasmMessage>{message}</ErrorWasmMessage>
      </ErrorWasmMessageBox>
    </ErrorContainer>
  )
}

/** Look of `ErrorMessage` as a `div`, because a paragraph cannot hold the heading and the message paragraph */
const ErrorWasmMessageBox = styled(ErrorMessage)`
  margin: 0 0 1em;
`

const ErrorWasmMessage = styled.p`
  margin: 0;
  white-space: pre-wrap;
`
