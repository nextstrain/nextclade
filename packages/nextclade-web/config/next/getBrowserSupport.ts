import browserslist from 'browserslist'

export interface BrowserSupport {
  chrome: number
  edge: number
  firefox: number
  safari: number
  ios: number
}

const BROWSER_NAME_MAP: Record<string, keyof BrowserSupport> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  ios_saf: 'ios',
}

export function getBrowserSupport(queries: string[]): BrowserSupport {
  const browsers = browserslist(queries)

  const minVersions: Partial<BrowserSupport> = {}

  for (const browser of browsers) {
    const [name, version] = browser.split(' ')
    const mappedName = BROWSER_NAME_MAP[name]
    if (!mappedName) {
      continue
    }

    const versionNum = parseFloat(version.split('-')[0])
    if (Number.isNaN(versionNum)) {
      continue
    }

    const current = minVersions[mappedName]
    if (current === undefined || versionNum < current) {
      minVersions[mappedName] = versionNum
    }
  }

  return {
    chrome: minVersions.chrome ?? 0,
    edge: minVersions.edge ?? 0,
    firefox: minVersions.firefox ?? 0,
    safari: minVersions.safari ?? 0,
    ios: minVersions.ios ?? 0,
  }
}
