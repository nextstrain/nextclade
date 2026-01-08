import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilState, useResetRecoilState } from 'recoil'
import classNames from 'classnames'
import { debounce } from 'lodash'
import { MdRefresh } from 'react-icons/md'
import { Alert, FormGroup, Label } from 'reactstrap'

import { PROJECT_NAME } from 'src/constants'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { TableSlim } from 'src/components/Common/TableSlim'
import { MEMORY_BYTES_PER_THREAD_MINIMUM, useGuessNumThreads } from 'src/helpers/getNumThreads'
import { prettyBytes } from 'src/i18n/i18n'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { NumericInput } from 'src/components/Common/NumericInput'
import { numThreadsAtom } from 'src/state/settings.state'

function validateNumThreads(value: number): string | undefined {
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    return 'Should be a positive integer from 1 to 1000'
  }
  return undefined
}

export function SystemSettings() {
  const { t } = useTranslationSafe()

  const [numThreads, setNumThreads] = useRecoilState(numThreadsAtom)
  const resetNumThreads = useResetRecoilState(numThreadsAtom)
  const guess = useGuessNumThreads(numThreads)

  const [localValue, setLocalValue] = useState(numThreads)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    setLocalValue(numThreads)
  }, [numThreads])

  const setNumThreadsDebounced = useMemo(
    () => debounce(setNumThreads, 500, { leading: false, trailing: true }),
    [setNumThreads],
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(e.target.value, 10)
      setLocalValue(value)

      const validationError = validateNumThreads(value)
      setError(validationError)

      if (!validationError) {
        setNumThreadsDebounced(value)
      }
    },
    [setNumThreadsDebounced],
  )

  const handleReset = useCallback(() => {
    resetNumThreads()
    setError(undefined)
  }, [resetNumThreads])

  const memoryAvailable = useMemo(() => {
    return guess.memoryAvailable ? prettyBytes.format(guess.memoryAvailable) : t('unsupported')
  }, [guess.memoryAvailable, t])

  const memoryAvailablePerThread = useMemo(() => {
    return guess.memoryAvailable ? prettyBytes.format(guess.memoryAvailable / numThreads) : t('unsupported')
  }, [guess.memoryAvailable, numThreads, t])

  return (
    <form>
      <FormGroup>
        <Label className="d-block w-100">
          <NumericInput
            id="numThreads"
            min={1}
            max={1000}
            className={classNames('d-inline', error && 'border-danger')}
            type="number"
            identifier="settings-num-threads-input"
            value={localValue}
            onChange={handleChange}
          />
          <span className="d-inline">
            <span className="mx-3">{t('Number of CPU threads')}</span>
            <span className="mx-auto">
              <ButtonTransparent className="my-0" type="button" title={t('Reset to default')} onClick={handleReset}>
                <MdRefresh /> {t('Reset')}
              </ButtonTransparent>
            </span>
          </span>
          {error && <p className="text-danger">{error}</p>}
          {guess.numThreads && guess.memoryAvailable && (
            <Alert className="mt-2 p-1" color="primary" isOpen fade={false}>
              <TableSlim borderless className="small mb-1">
                <tbody>
                  <tr>
                    <td>{t('Memory available*')}</td>
                    <td>{memoryAvailable}</td>
                  </tr>

                  <tr>
                    <td>{t('Memory per CPU thread')}</td>
                    <td>{memoryAvailablePerThread}</td>
                  </tr>

                  <tr>
                    <td>{t('Recommended number of CPU threads**')}</td>
                    <td>{guess.numThreads ?? t('unsupported')}</td>
                  </tr>

                  <tr>
                    <td colSpan={2} className="small">
                      {t('* Current value. This amount can change depending on load')}
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={2} className="small">
                      {t('** {{appName}} requires at least {{memoryRequired}} of memory per thread', {
                        appName: PROJECT_NAME,
                        memoryRequired: prettyBytes.format(MEMORY_BYTES_PER_THREAD_MINIMUM),
                      })}
                    </td>
                  </tr>
                </tbody>
              </TableSlim>
            </Alert>
          )}
        </Label>
      </FormGroup>
    </form>
  )
}
