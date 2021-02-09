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
      alt="Report issue button"
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
