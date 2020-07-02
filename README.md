<h1 id="nextclade" align="center">
Nextclade
</h1>

<h4 id="nextclade" align="center">
Clade assignment, mutation calling, and quality control right inside your browser
</h1>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="https://clades.nextstrain.org" alt="Link to our website">
    🌐 clades.nextstrain.org
  </a>
</p>

<blockquote align="center">
Nextclade is a simple web-tool to assign <a target="_blank" rel="noopener noreferrer" href="https://nextstrain.org">Nextstrain</a> <a target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/Clade">clade</a> to the <a target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/Severe_acute_respiratory_syndrome_coronavirus_2">SARS-CoV-2</a> <a target="_blank" rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/DNA_sequencing">sequences</a>.
</blockquote>

<p align="center">
  <a href="docs/assets/ui.gif" target="_blank" rel="noopener noreferrer"  alt="Link to animated screenshot of the application, showcasing the user interface on main page">
    <img
      width="100%"
      height="auto"
      src="docs/assets/ui.gif"
      alt="Animated screenshot of the application, showcasing the user interface on main page"
    />
  </a>
</p>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="LICENSE">
    <img src="https://img.shields.io/github/license/neherlab/webclades" alt="License" />
  </a>

  <a href="packages/web/package.json">
    <img
      src="https://img.shields.io/github/package-json/v/neherlab/webclades/master/packages/web?label=version&logo=npm"
      alt="package.json version"
    />
  </a>
  <a href="https://clades.nextstrain.org/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fclades.nextstrain.org&logo=circle&logoColor=white&label=clades.nextstrain.org" />
  </a>
  <a href="https://staging.clades.nextstrain.org/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fstaging.clades.nextstrain.org&logo=circle&logoColor=white&label=staging.clades.nextstrain.org" />
  </a>
  <a href="https://master.clades.nextstrain.org/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fmaster.clades.nextstrain.org&logo=circle&logoColor=white&label=master.clades.nextstrain.org" />
  </a>
</p>

<p align="center">
  <a href="https://travis-ci.org/github/neherlab/webclades/branches">
    <img src="https://img.shields.io/travis/neherlab/webclades/release?label=build%3Aproduction" alt="Travis CI production" />
  </a>
  <a href="https://travis-ci.org/github/neherlab/webclades/branches">
    <img src="https://img.shields.io/travis/neherlab/webclades/master?label=build%3Astaging" alt="Travis CI staging" />
  </a>

  <a href="https://travis-ci.org/github/neherlab/webclades/branches">
    <img src="https://img.shields.io/travis/neherlab/webclades/master?label=build%3Amaster" alt="Travis CI master" />
  </a>

  <a href="https://snyk.io/test/github/neherlab/webclades?targetFile=packages/web/package.json">
    <img src="https://snyk.io/test/github/neherlab/webclades/master/badge.svg?targetFile=packages/web/package.json" alt="Snyk">
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

  <a href="https://codeclimate.com/github/neherlab/webclades">
    <img src="https://img.shields.io/codeclimate/maintainability/neherlab/webclades?label=codeclimate" />
  </a>

  <a href="https://codeclimate.com/github/neherlab/webclades">
    <img src="https://img.shields.io/codeclimate/tech-debt/neherlab/webclades" />
  </a>

  <a href="https://codecov.io/gh/neherlab/webclades">
    <img src="https://codecov.io/gh/neherlab/webclades/branch/master/graph/badge.svg" />
  </a>

</p>

<p align="center">
  <a href="https://david-dm.org/neherlab/webclades">
    <img src="https://david-dm.org/neherlab/webclades.svg" alt="Dependency Status" />
  </a>

  <a href="https://david-dm.org/neherlab/webclades?type=dev">
    <img src="https://david-dm.org/neherlab/webclades/dev-status.svg" alt="Dependency Status Dev" />
  </a>

  <a href="https://github.com/neherlab/webclades/commits">
    <img
      src="https://img.shields.io/github/last-commit/neherlab/webclades?logo=github"
      alt="GitHub last commit"
    />
  </a>

  <a href="https://github.com/neherlab/webclades/commits">
    <img
      src="https://img.shields.io/github/commit-activity/w/neherlab/webclades"
      alt="GitHub commit activity"
    />
  </a>

  <a href="https://github.com/neherlab/webclades/graphs/contributors">
    <img
      src="https://img.shields.io/github/contributors/neherlab/webclades?logo=github&label=developers"
      alt="GitHub contributors"
    />
  </a>
</p>

## 🖥️ Developers guide

### Quick start

Install the requirements:

- <a target="_blank" rel="noopener noreferrer" href="https://git-scm.com/downloads">Git</a> >= 2.0
- <a target="_blank" rel="noopener noreferrer" href="https://nodejs.org/">Node.js</a> >= 12 (we recommend installation through <a target="_blank" rel="noopener noreferrer" href="https://github.com/nvm-sh/nvm">nvm</a> or
  <a target="_blank" rel="noopener noreferrer" href="https://github.com/coreybutler/nvm-windows">nvm-windows</a>)
- 1.0 < yarn < 2.0

In order to run the application in development mode, run:

```bash
git clone https://github.com/neherlab/webclades
cd webclades/packages/web
cp .env.example .env
yarn install
yarn dev

```

(on Windows, substitute `cp` with `copy`)

This will trigger the development server and build process. Wait for the build to finish, then navigate to
`http://localhost:3000` in a browser (last 5 versions of Chrome or Firefox are supported in development mode).

### Production build

In order to replicate the production build locally, use this command:

```bash

yarn prod:watch

```

This should build the application in production mode and start a static server that will serve the app on
`http://localhost:8080` (by default)

## Sponsors

We are thankful to:

<table>
<tr>
<td align="center">
<a target="_blank" rel="noopener noreferrer" href="https://vercel.com/?utm_source=nextstrain">
<img src="packages/web/src/assets/img/powered-by-vercel.svg" width="200px" alt="Vercel logo" />
</a>
</td>
<td align="center">
Vercel for sponsoring our builds on their platform
</td>
</tr>
</table>

## ✨ Contributors

We are thankful to all our contributors, no matter how they contribute: in ideas, science, code, documentation or otherwise. Thanks goes to these people (<a target="_blank" rel="noopener noreferrer" href="https://allcontributors.org/docs/en/emoji-key">emoji key</a>):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/ivan-aksamentov"><img src="https://avatars0.githubusercontent.com/u/9403403?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ivan Aksamentov</b></sub></a><br /><a href="https://github.com/neherlab/webclades/commits?author=ivan-aksamentov" title="Code">💻</a> <a href="#data-ivan-aksamentov" title="Data">🔣</a> <a href="#design-ivan-aksamentov" title="Design">🎨</a> <a href="#ideas-ivan-aksamentov" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/neherlab/webclades/issues?q=author%3Aivan-aksamentov" title="Bug reports">🐛</a> <a href="#content-ivan-aksamentov" title="Content">🖋</a> <a href="https://github.com/neherlab/webclades/commits?author=ivan-aksamentov" title="Documentation">📖</a> <a href="#maintenance-ivan-aksamentov" title="Maintenance">🚧</a> <a href="#translation-ivan-aksamentov" title="Translation">🌍</a> <a href="https://github.com/neherlab/webclades/commits?author=ivan-aksamentov" title="Tests">⚠️</a> <a href="#talk-ivan-aksamentov" title="Talks">📢</a> <a href="https://github.com/neherlab/webclades/pulls?q=is%3Apr+reviewed-by%3Aivan-aksamentov" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://github.com/rneher"><img src="https://avatars3.githubusercontent.com/u/8379168?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Richard Neher</b></sub></a><br /><a href="https://github.com/neherlab/webclades/commits?author=rneher" title="Code">💻</a> <a href="#data-rneher" title="Data">🔣</a> <a href="#design-rneher" title="Design">🎨</a> <a href="#ideas-rneher" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/neherlab/webclades/issues?q=author%3Arneher" title="Bug reports">🐛</a> <a href="#content-rneher" title="Content">🖋</a> <a href="https://github.com/neherlab/webclades/commits?author=rneher" title="Documentation">📖</a> <a href="#maintenance-rneher" title="Maintenance">🚧</a> <a href="#translation-rneher" title="Translation">🌍</a> <a href="https://github.com/neherlab/webclades/commits?author=rneher" title="Tests">⚠️</a> <a href="#talk-rneher" title="Talks">📢</a> <a href="https://github.com/neherlab/webclades/pulls?q=is%3Apr+reviewed-by%3Arneher" title="Reviewed Pull Requests">👀</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the <a target="_blank" rel="noopener noreferrer" href="https://github.com/all-contributors/all-contributors">all-contributors</a> specification. Contributions of any kind welcome!

## License

<a target="_blank" rel="noopener noreferrer" href="LICENSE" alt="License file">MIT License</a>
