<h1 id="nextclade" align="center">
Nextclade
</h1>

<h4 id="nextclade" align="center">
Clade assignment, mutation calling, and sequence quality checks
</h1>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="https://clades.nextstrain.org" alt="Link to our website">
    🌐 clades.nextstrain.org
  </a>
</p>

<blockquote align="center">
Nextclade is a simple web-tool to assign <a target="_blank" rel="noopener noreferrer" href="https://nextstrain.org">Nextstrain</a> <a target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/Clade">clades</a> to <a target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/Severe_acute_respiratory_syndrome_coronavirus_2">SARS-CoV-2</a> <a target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/DNA_sequencing">sequences</a>.
</blockquote>

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/raw/master/docs/assets/ui.gif" target="_blank" rel="noopener noreferrer"  alt="Link to animated screenshot of the application, showcasing the user interface on main page">
    <img
      width="100%"
      height="auto"
      src="https://github.com/nextstrain/nextclade/raw/master/docs/assets/ui.gif"
      alt="Animated screenshot of the application, showcasing the user interface on main page"
    />
  </a>
</p>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="LICENSE">
    <img src="https://img.shields.io/github/license/nextstrain/nextclade" alt="License" />
  </a>

  <a href="packages/web/package.json">
    <img
      src="https://img.shields.io/github/package-json/v/nextstrain/nextclade/master/packages/web?label=version&logo=npm"
      alt="package.json version"
    />
  </a>
  <a href="https://clades.nextstrain.org/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fclades.nextstrain.org&logo=circle&logoColor=white&label=clades.nextstrain.org" />
  </a>
  <a href="https://nextstrain:nextstrain@staging.clades.nextstrain.org/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fnextstrain%3Anextstrain%40staging.clades.nextstrain.org&logo=circle&logoColor=white&label=staging.clades.nextstrain.org" />
  </a>
  <a href="https://nextstrain:nextstrain@master.clades.nextstrain.org/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fnextstrain%3Anextstrain%40master.clades.nextstrain.org&logo=circle&logoColor=white&label=master.clades.nextstrain.org" />
  </a>
</p>

<p align="center">
  <a href="https://travis-ci.org/github/nextstrain/nextclade/branches">
    <img src="https://img.shields.io/travis/nextstrain/nextclade/release?label=build%3Aproduction" alt="Travis CI production" />
  </a>
  <a href="https://travis-ci.org/github/nextstrain/nextclade/branches">
    <img src="https://img.shields.io/travis/nextstrain/nextclade/master?label=build%3Astaging" alt="Travis CI staging" />
  </a>

  <a href="https://travis-ci.org/github/nextstrain/nextclade/branches">
    <img src="https://img.shields.io/travis/nextstrain/nextclade/master?label=build%3Amaster" alt="Travis CI master" />
  </a>

  <a href="https://securityheaders.com/?q=clades.nextstrain.org&followRedirects=on">
    <img src="https://img.shields.io/security-headers?url=https%3A%2F%2Fclades.nextstrain.org" alt="Security Headers" />
  </a>
  <a href="https://observatory.mozilla.org/analyze/clades.nextstrain.org">
    <img src="https://img.shields.io/mozilla-observatory/grade/clades.nextstrain.org" alt="Mozilla Observatory" />
  </a>
</p>

<p align="center">

  <a href="https://deepscan.io/dashboard#view=project&tid=8207&pid=12611&bid=195750">
    <img src="https://deepscan.io/api/teams/8207/projects/12611/branches/195750/badge/grade.svg" alt="DeepScan grade">
  </a>

  <a href="https://codeclimate.com/github/nextstrain/nextclade">
    <img src="https://img.shields.io/codeclimate/maintainability/nextstrain/nextclade?label=codeclimate" />
  </a>

  <a href="https://codeclimate.com/github/nextstrain/nextclade">
    <img src="https://img.shields.io/codeclimate/tech-debt/nextstrain/nextclade" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/commits">
    <img
      src="https://img.shields.io/github/last-commit/nextstrain/nextclade?logo=github"
      alt="GitHub last commit"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/commits">
    <img
      src="https://img.shields.io/github/commit-activity/w/nextstrain/nextclade"
      alt="GitHub commit activity"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/graphs/contributors">
    <img
      src="https://img.shields.io/github/contributors/nextstrain/nextclade?logo=github&label=developers"
      alt="GitHub contributors"
    />
  </a>
</p>

---

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/releases">
    <img height="50px"
      src="https://img.shields.io/badge/Visit%20clades.nextstrain.org-%23aa1718.svg"
      alt="Download button"
    />
  </a>
</p>

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="50px"
      src="https://img.shields.io/badge/%F0%9F%93%A2%20Report%20Issue-%2317992a.svg"
      alt="Download button"
    />
  </a>
</p>

---

## 🖥️ Developers guide

### Quick start

Install the requirements:

- <a target="_blank" rel="noopener noreferrer" href="https://git-scm.com/downloads">Git</a> >= 2.0
- <a target="_blank" rel="noopener noreferrer" href="https://nodejs.org/">Node.js</a> >= 12 (we recommend installation through <a target="_blank" rel="noopener noreferrer" href="https://github.com/nvm-sh/nvm">nvm</a> or
  <a target="_blank" rel="noopener noreferrer" href="https://github.com/coreybutler/nvm-windows">nvm-windows</a>)
- 1.0 < yarn < 2.0

In order to run the application in development mode, run:

```bash
git clone https://github.com/nextstrain/nextclade
cd nextclade/packages/web
cp .env.example .env
yarn install
```

then start the development server with:

```bash
yarn dev
```

for Windows, (without Linux Subsystem), try:

```bash
yarn dev:start_win
```

and substitute `cp` with `copy`.

This will trigger the development server and build process. Wait for the build to finish, then navigate to
`http://localhost:3000` in a browser (last 5 versions of Chrome or Firefox are supported in development mode).

### Production build

In order to replicate the production build locally, use this command:

```bash

yarn prod:watch

```

This should build the application in production mode and start a static server that will serve the app on
`http://localhost:8080` (by default)

### Translations

Translations are done using react-i18n. It is convenient to use Machine translation feature of GitLocalize.

The list of languages at the moment of writing:

- [ar](https://gitlocalize.com/repo/4819/ar/packages/web/src/i18n/resources/en/common.json)
- [de](https://gitlocalize.com/repo/4819/de/packages/web/src/i18n/resources/en/common.json)
- [es](https://gitlocalize.com/repo/4819/es/packages/web/src/i18n/resources/en/common.json)
- [fr](https://gitlocalize.com/repo/4819/fr/packages/web/src/i18n/resources/en/common.json)
- [it](https://gitlocalize.com/repo/4819/it/packages/web/src/i18n/resources/en/common.json)
- [ko](https://gitlocalize.com/repo/4819/ko/packages/web/src/i18n/resources/en/common.json)
- [pt](https://gitlocalize.com/repo/4819/pt/packages/web/src/i18n/resources/en/common.json)
- [ru](https://gitlocalize.com/repo/4819/ru/packages/web/src/i18n/resources/en/common.json)
- [zh](https://gitlocalize.com/repo/4819/zh/packages/web/src/i18n/resources/en/common.json)


## License

<a target="_blank" rel="noopener noreferrer" href="LICENSE" alt="License file">MIT License</a>
