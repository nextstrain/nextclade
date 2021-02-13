<h1 id="nextclade" align="center">
Nextclade
</h1>

<h4 id="nextclade" align="center">
Viral genome clade assignment, mutation calling, and sequence quality checks
</h4>

<p align="center">
by Nextstrain team
</p>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="https://clades.nextstrain.org">
    🌎 clades.nextstrain.org
  </a>
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/nextstrain/nextclade/master/docs/assets/ui.gif" target="_blank" rel="noopener noreferrer"  alt="Link to animated screenshot of the application, showcasing the user interface on main page">
    <img
      width="100%"
      height="auto"
      src="https://raw.githubusercontent.com/nextstrain/nextclade/master/docs/assets/ui.gif"
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

  <a href="https://deepscan.io/dashboard#view=project&tid=8207&pid=12611&bid=195750">
    <img src="https://deepscan.io/api/teams/8207/projects/12611/branches/195750/badge/grade.svg" alt="DeepScan grade">
  </a>
</p>

---

<p align="center">
  <a href="https://clades.nextstrain.org" target="_blank" rel="noopener noreferrer" >
    <img height="50px"
      src="https://img.shields.io/badge/%F0%9F%8C%8E%20Visit%20clades.nextstrain.org-%23aa1718.svg"
      alt="Download button"
    />
  </a>
</p>

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%93%A2%20Report%20Issue-%2317992a.svg"
      alt="Report issue button"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%99%8B%E2%80%8D%E2%99%80%EF%B8%8F%20Request%20feature-%2317992a.svg"
      alt="Request feature button"
    />
  </a>

  <a href="https://discussion.nextstrain.org">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%92%AC%20Discuss-%23d99852.svg"
      alt="Discuss button"
    />
  </a>
</p>

---


<h2 id="packages" align="center">
📦 Packages
</h2>


This repository consists of a set of packages presented in the table below. Refer to README files of individual packages for more details.

| Package                                  | Type           | Get                                                                    | Docker images                                                        |
| ---------------------------------------- | -------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [nextclade_web](/packages/web)           | Web App        | 🌎 [clades.nextstrain.org](https://clades.nextstrain.org)              |                                                                      |
| [nextclade_cli](/packages/cli)           | Node.js CLI    | 📦 [@neherlab/nextclade](@neherlab/nextclade)                          | 🐋 [neherlab/nextclade](https://hub.docker.com/r/neherlab/nextclade) |
| [nextalign](/packages/nextalign)         | C++ library    |                                                                        |                                                                      |
| [nextalign_cli](/packages/nextalign_cli) | C++ executable | 📥 [Github Releases](https://github.com/nextstrain/nextclade/releases) | 🐋 [neherlab/nextalign](https://hub.docker.com/r/neherlab/nextalign) |



<h2 id="team" align="center">
 ✨ Team
</h2>

Nextclade and nextalign are the parts of the [Nextstrain project](https://nextstrain.org).

They are maintained by

<table>
  <tr>
  <td align="center">
<p align="center">
  <p align="center">
    <a href="https://github.com/ivan-aksamentov">
      <img src="https://avatars.githubusercontent.com/u/9403403?s=100&&v=4" width="100px;" alt=""/>
    </a> 
  </p>
  <p align="center">
    <p align="center">
      <a href="https://github.com/ivan-aksamentov">
      Ivan Aksamentov
      </a>
    </p>
    <p align="center">
      <small>Senior Software Engineer</small></br>
      <small>NeherLab, Biozentrum, University of Basel</small></br>
    </p>
  </p>
  </td>

  <td align="center">
  <p align="center">
    <a href="https://github.com/rneher">
      <img src="https://avatars.githubusercontent.com/u/8379168?s=100&&v=4" width="100px;" alt=""/>
    </a> 
  </p>
  <p align="center">
    <p align="center">
      <a href="https://github.com/rneher">
      Richard Neher
      </a>
    </p>
    <p align="center">
      <small>Principal Investigator</small></br>
      <small>NeherLab, Biozentrum, University of Basel</small></br>
    </p>
  </p>
</p>
</td>
  </tr>
</table>

We are thankful to all our contributors, no matter how they contribute: in ideas, science, code, documentation or otherwise. Thanks goes to these people (<a target="_blank" rel="noopener noreferrer" href="https://allcontributors.org/docs/en/emoji-key">emoji key</a>):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/emmahodcroft"><img src="https://avatars1.githubusercontent.com/u/14290674?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Emma Hodcroft</b></sub></a><br /><a href="#ideas-emmahodcroft" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/nextstrain/nextclade/commits?author=emmahodcroft" title="Tests">⚠️</a> <a href="#talk-emmahodcroft" title="Talks">📢</a> <a href="https://github.com/nextstrain/nextclade/pulls?q=is%3Apr+reviewed-by%3Aemmahodcroft" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://tsibley.net/"><img src="https://avatars2.githubusercontent.com/u/79913?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Thomas Sibley</b></sub></a><br /><a href="#infra-tsibley" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#security-tsibley" title="Security">🛡️</a></td>
    <td align="center"><a href="http://theo.io/"><img src="https://avatars.githubusercontent.com/u/19732295?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Theo Sanderson</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=theosanderson" title="Code">💻</a></td>
    <td align="center"><a href="http://www.natalieastroud.com/"><img src="https://avatars3.githubusercontent.com/u/17433156?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Natalie Stroud</b></sub></a><br /><a href="#content-stroudn1" title="Content">🖋</a> <a href="#translation-stroudn1" title="Translation">🌍</a></td>
    <td align="center"><a href="http://www.rubinsteyn.com/"><img src="https://avatars.githubusercontent.com/u/48441?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alex Rubinsteyn</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=iskandr" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/molecules"><img src="https://avatars.githubusercontent.com/u/345060?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Christopher Bottoms</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=molecules" title="Documentation">📖</a></td>
    <td align="center"><a href="http://finlaymagui.re/"><img src="https://avatars.githubusercontent.com/u/1698629?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Finlay Maguire</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=fmaguire" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the <a target="_blank" rel="noopener noreferrer" href="https://github.com/all-contributors/all-contributors">all-contributors</a> specification. Contributions of any kind welcome!


<h2 id="sponsors" align="center">
🏢 Sponsors
</h2>

We are thankful to the following companies who supported us:

<table>
<tr>
<td align="center">
<a target="_blank" rel="noopener noreferrer" href="https://vercel.com/?utm_source=nextstrain">
<img src="packages/web/src/assets/img/powered-by-vercel.svg" width="150px" alt="Vercel logo" />
</a>
</td>
<td align="center">
Vercel for sponsoring Nextclade builds on their platform
</td>
</tr>
</table>


<h2 id="license" align="center">
⚖️ License
</h2>

<a target="_blank" rel="noopener noreferrer" href="../LICENSE" alt="License file">MIT License</a>
