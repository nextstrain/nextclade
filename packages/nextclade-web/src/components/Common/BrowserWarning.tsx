import Bowser from 'bowser'
import { concurrent } from 'fasy'
import React, { useEffect, useState } from 'react'
import { atom } from 'recoil'
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap'
import * as wasmFeatureDetect from 'wasm-feature-detect'
import { PROJECT_NAME } from 'src/constants'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { ModalHeader } from 'src/components/Error/ErrorPopup'
import { ButtonCopyToClipboard, Details, DetailsBody, Summary } from 'src/components/Error/ErrorContent'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { getMemoryMegabytesAvailableString } from 'src/helpers/getNumThreads'
import { getVersionString } from 'src/helpers/getVersionString'

interface BrowserVersions {
  chrome: number
  edge: number
  firefox: number
  safari: number
  ios: number
}

const EXPECTED_WASM_FEATURES: string[] = JSON.parse(process.env.WASM_FEATURES ?? '[]')
const EXPECTED_BROWSERS: BrowserVersions = JSON.parse(process.env.BROWSER_SUPPORT ?? '{}')

const browserWarningDismissedAtom = atom({
  key: 'browserWarningDismissedAtom',
  default: false,
})

interface BrowserCheckResult {
  isSupported: boolean
  expected: {
    browsers: BrowserVersions
    wasmFeatures: string[]
  }
  detected: {
    browser: { name: string | undefined; version: string | undefined }
    wasmFeatures: Record<string, boolean>
  }
}

async function detectAllWasmFeatures(features: string[]): Promise<Record<string, boolean>> {
  const detections = await concurrent.map(async (feature) => {
    const detector = wasmFeatureDetect[feature as keyof typeof wasmFeatureDetect]
    const supported = detector ? await detector() : false
    return [feature, supported] as const
  }, features)
  return Object.fromEntries(detections)
}

function checkBrowserVersion(): { name: string | undefined; version: string | undefined; isSupported: boolean } {
  const browser = Bowser.getParser(window?.navigator?.userAgent)
  const { name, version } = browser.getBrowser()

  const isSupported =
    browser.satisfies({
      chrome: `>=${EXPECTED_BROWSERS.chrome}`,
      edge: `>=${EXPECTED_BROWSERS.edge}`,
      firefox: `>=${EXPECTED_BROWSERS.firefox}`,
      safari: `>=${EXPECTED_BROWSERS.safari}`,
    }) ?? false

  return { name, version, isSupported }
}

function getBrowserReportText(checkResult: BrowserCheckResult): string {
  const userAgent = typeof window !== 'undefined' ? window?.navigator?.userAgent : 'unknown'

  return `${PROJECT_NAME} ${getVersionString()}

Memory available: ${getMemoryMegabytesAvailableString()}

User agent: ${userAgent}

Expected:
${JSON.stringify(checkResult.expected, null, 2)}

Detected:
${JSON.stringify(checkResult.detected, null, 2)}
`
}

export function BrowserWarning() {
  const { t } = useTranslation()
  const { state: dismissed, toggle: dismiss } = useRecoilToggle(browserWarningDismissedAtom)
  const [checkResult, setCheckResult] = useState<BrowserCheckResult | null>(null)

  useEffect(() => {
    async function check() {
      const browserCheck = checkBrowserVersion()
      const detectedWasmFeatures = await detectAllWasmFeatures(EXPECTED_WASM_FEATURES)
      const allWasmFeaturesSupported = Object.values(detectedWasmFeatures).every(Boolean)
      const isSupported = browserCheck.isSupported && allWasmFeaturesSupported

      setCheckResult({
        isSupported,
        expected: {
          browsers: EXPECTED_BROWSERS,
          wasmFeatures: EXPECTED_WASM_FEATURES,
        },
        detected: {
          browser: { name: browserCheck.name, version: browserCheck.version },
          wasmFeatures: detectedWasmFeatures,
        },
      })
    }
    void check()
  }, [])

  if (!checkResult || checkResult.isSupported || dismissed) {
    return null
  }

  const nameAndVersion = [checkResult.detected.browser.name, checkResult.detected.browser.version]
    .filter(notUndefinedOrNull)
    .join(' ')

  return (
    <Modal centered isOpen backdrop="static" toggle={dismiss} fade={false} size="lg">
      <ModalHeader toggle={dismiss} tag="div">
        <h4 className="text-center text-danger">{t('Unsupported browser')}</h4>
      </ModalHeader>

      <ModalBody>
        <p>
          {t(
            'This browser version ({{nameAndVersion}}) is not supported, which means that it may lack capabilities necessary for {{project}} to operate.',
            { nameAndVersion, project: PROJECT_NAME },
          )}
        </p>

        <p>
          {t(
            'You can proceed, but the functioning of {{project}} and correctness of results cannot be guaranteed. Developers cannot investigate issues occurred when using this browser.',
            { project: PROJECT_NAME },
          )}
        </p>

        <p>
          {t('{{project}} works best in the latest versions of ', { project: PROJECT_NAME })}
          <LinkExternal href="https://www.google.com/chrome/">{'Chrome'}</LinkExternal>
          <span>{t(' and ')}</span>
          <LinkExternal href="https://www.mozilla.org/firefox/browsers/">{'Firefox'}</LinkExternal>
          <span>{t('. ')}</span>
          <span>{t('Please give them a try!')}</span>
        </p>

        <Details className="mt-3">
          <Summary className="d-flex">
            <span className="my-auto">{t('Technical details (click to expand)')}</span>
            <span className="my-auto ml-auto">
              <ButtonCopyToClipboard text={getBrowserReportText(checkResult)} />
            </span>
          </Summary>
          <DetailsBody>
            <pre className="small text-muted my-2">{getBrowserReportText(checkResult)}</pre>
          </DetailsBody>
        </Details>
      </ModalBody>

      <ModalFooter>
        <div className="mx-auto">
          <Button type="button" color="danger" title={t('Close this dialog window')} onClick={dismiss}>
            {t('I want to try anyway')}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
