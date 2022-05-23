import React, { useCallback, useMemo } from 'react'
import { useRecoilState, useResetRecoilState } from 'recoil'
import classNames from 'classnames'
import { Form, Formik, FormikErrors, FormikHelpers, useFormikContext } from 'formik'
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

export interface SettingsFormValues {
  numThreads: number
}

export function SystemSettings() {
  const { t } = useTranslationSafe()

  const [numThreads, setNumThreads] = useRecoilState(numThreadsAtom)
  const resetNumThreads = useResetRecoilState(numThreadsAtom)
  const guess = useGuessNumThreads(numThreads)
  const handleValidate = useCallback((values: SettingsFormValues): FormikErrors<SettingsFormValues> => {
    const errors: FormikErrors<SettingsFormValues> = {}
    const { numThreads } = values
    if (!Number.isInteger(numThreads) || numThreads < 0 || numThreads > 1000) {
      errors.numThreads = 'Should be a positive integer from 1 to 1000'
    }
    return errors
  }, [])

  const setNumThreadsDebounced = useMemo(
    () => debounce(setNumThreads, 500, { leading: false, trailing: true }), // prettier-ignore
    [setNumThreads],
  )

  const handleSubmit = useCallback(
    (values: SettingsFormValues, { setSubmitting }: FormikHelpers<SettingsFormValues>) => {
      setNumThreadsDebounced(values.numThreads)
      setSubmitting(false)
    },
    [setNumThreadsDebounced],
  )

  const initialValues = useMemo(() => ({ numThreads }), [numThreads])
  const onReset = useCallback(() => ({ numThreads }), [numThreads])

  const memoryAvailable = useMemo(() => {
    return guess.memoryAvailable ? prettyBytes.format(guess.memoryAvailable) : t('unsupported')
  }, [guess.memoryAvailable, t])

  const memoryAvailablePerThread = useMemo(() => {
    return guess.memoryAvailable ? prettyBytes.format(guess.memoryAvailable / numThreads) : t('unsupported')
  }, [guess.memoryAvailable, numThreads, t])

  return (
    <Formik initialValues={initialValues} validate={handleValidate} onSubmit={handleSubmit} onReset={onReset}>
      {({ values, errors, touched, handleChange, handleBlur, resetForm }) => (
        <Form>
          <FormikAutoSubmit />

          <FormGroup>
            <Label className="d-block w-100">
              <NumericInput
                id="numThreads"
                min={1}
                max={1000}
                className={classNames('d-inline', errors?.numThreads && 'border-danger')}
                type="number"
                identifier="settings-num-threads-input"
                value={values.numThreads}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <span className="d-inline">
                <span className="mx-3">{t('Number of CPU threads')}</span>
                <span className="mx-auto">
                  <ButtonTransparent
                    className="my-0"
                    type="button"
                    title={t('Reset to default')}
                    // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
                    onClick={() => {
                      resetNumThreads()
                      resetForm()
                    }}
                  >
                    <MdRefresh /> {t('Reset')}
                  </ButtonTransparent>
                </span>
              </span>
              {touched.numThreads && errors?.numThreads && <p className="text-danger">{errors.numThreads}</p>}
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
        </Form>
      )}
    </Formik>
  )
}

export function FormikAutoSubmit() {
  const { values, submitForm, isValid } = useFormikContext()
  React.useEffect(() => {
    if (isValid) {
      void submitForm() // eslint-disable-line no-void
    }
  }, [values, submitForm, isValid])
  return null
}
