import React, { useCallback, useMemo } from 'react'

import { debounce } from 'lodash'

import {
  Alert,
  Button,
  ButtonProps,
  Col,
  Container,
  FormGroup,
  Label,
  Modal as ReactstrapModal,
  ModalBody as ReactstrapModalBody,
  ModalFooter as ReactstrapModalFooter,
  ModalHeader as ReactstrapModalHeader,
  Row,
} from 'reactstrap'
import classNames from 'classnames'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { changelogShouldShowOnUpdatesAtom, isSettingsDialogOpenAtom, numThreadsAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import { IoMdSettings } from 'react-icons/io'
import { MdRefresh } from 'react-icons/md'
import { useFormikContext, Formik, Form, FormikHelpers, FormikErrors } from 'formik'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { Toggle } from 'src/components/Common/Toggle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Input } from 'src/components/Common/NumericField'
import { MEMORY_BYTES_PER_THREAD_MINIMUM, useGuessNumThreads } from 'src/helpers/getNumThreads'
import { PROJECT_NAME } from 'src/constants'
import { prettyBytes } from 'src/i18n/i18n'
import { TableSlim } from 'src/components/Common/TableSlim'

export const ButtonSettingsBase = styled(ButtonTransparent)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  color: ${(props) => props.theme.gray700};

  width: 50px;
  @media (min-width: 1200px) {
    width: 100px;
  }
`

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
`

export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    width: 100%;
  }
  padding: 1rem;
`

export const Modal = styled(ReactstrapModal)`
  @media (max-width: 1200px) {
    min-width: 50vw;
  }
`

export const ModalBody = styled(ReactstrapModalBody)`
  max-height: 66vh;
  min-height: 300px;

  padding: 1rem 0;

  overflow-y: auto;

  // prettier-ignore
  background:
    linear-gradient(#ffffff 33%, rgba(255,255,255, 0)),
    linear-gradient(rgba(255,255,255, 0), #ffffff 66%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(119,119,119, 0.5), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(119,119,119, 0.5), rgba(0,0,0,0)) 0 100%;
  background-color: #ffffff;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
  background-size: 100% 24px, 100% 24px, 100% 8px, 100% 8px;
`

export const ModalFooter = styled(ReactstrapModalFooter)`
  padding: 0;
`

export const NumericInput = styled(Input)`
  display: inline;
  max-width: 5rem;
`

export interface SettingsFormValues {
  numThreads: number
}

export function SettingsButton() {
  const { t } = useTranslationSafe()

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useRecoilState(isSettingsDialogOpenAtom)
  const [showWhatsnewOnUpdate, setShowWhatsnewOnUpdate] = useRecoilState(changelogShouldShowOnUpdatesAtom)
  const [numThreads, setNumThreads] = useRecoilState(numThreadsAtom)
  const resetNumThreads = useResetRecoilState(numThreadsAtom)

  const guess = useGuessNumThreads(numThreads)

  const toggleOpen = useCallback(
    () => setIsSettingsDialogOpen(!isSettingsDialogOpen),
    [setIsSettingsDialogOpen, isSettingsDialogOpen],
  )

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

  const text = useMemo(() => t('Settings'), [t])
  const closeText = useMemo(() => t('Close this window'), [t])

  const initialValues = useMemo(() => ({ numThreads }), [numThreads])
  const onReset = useCallback(() => ({ numThreads }), [numThreads])

  return (
    <>
      <ButtonSettingsBase type="button" onClick={toggleOpen} title={text}>
        <IoMdSettings className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonSettingsBase>

      <Modal backdrop="static" centered isOpen={isSettingsDialogOpen} toggle={toggleOpen} fade={false}>
        <ModalHeader toggle={toggleOpen} tag="div">
          <h3 className="text-center">{text}</h3>
        </ModalHeader>

        <ModalBody>
          <Container>
            <Row>
              <Col>
                <Formik
                  initialValues={initialValues}
                  validate={handleValidate}
                  onSubmit={handleSubmit}
                  onReset={onReset}
                >
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
                          {touched.numThreads && errors?.numThreads && (
                            <p className="text-danger">{errors.numThreads}</p>
                          )}
                          {guess.numThreads && guess.memoryAvailable && (
                            <Alert className="mt-2 p-1" color="primary" isOpen fade={false}>
                              <TableSlim borderless className="small mb-1">
                                <tbody>
                                  <tr>
                                    <td>{t('Memory available*')}</td>
                                    <td>
                                      {guess.memoryAvailable
                                        ? prettyBytes.format(guess.memoryAvailable)
                                        : t('unsupported')}
                                    </td>
                                  </tr>

                                  <tr>
                                    <td>{t('Memory per CPU thread')}</td>
                                    <td>
                                      {guess.memoryAvailable
                                        ? prettyBytes.format(guess.memoryAvailable / numThreads)
                                        : t('unsupported')}
                                    </td>
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

                      <FormGroup>
                        <Toggle
                          identifier={'settings-show-whatsnew-toggle'}
                          checked={showWhatsnewOnUpdate}
                          onCheckedChanged={setShowWhatsnewOnUpdate}
                        >
                          {t(`Show "What's new" dialog after each update`)}
                        </Toggle>
                      </FormGroup>
                    </Form>
                  )}
                </Formik>
              </Col>
            </Row>
          </Container>
        </ModalBody>

        <ModalFooter>
          <Container fluid>
            <Row noGutters className="my-2">
              <Col className="d-flex w-100">
                <ButtonOk className="ml-auto" type="button" color="success" onClick={toggleOpen} title={closeText}>
                  {t('OK')}
                </ButtonOk>
              </Col>
            </Row>
          </Container>
        </ModalFooter>
      </Modal>
    </>
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
