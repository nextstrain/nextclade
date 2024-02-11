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

| <video controls autoplay loop muted src="https://github.com/nextstrain/nextclade/assets/9403403/9bf0bab5-b7ee-4161-96a6-23e76ddb56b4" width="680"></video>                             |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Brief demonstration of Nextclade Web. Large version is <a target="_blank" href="https://github.com/nextstrain/nextclade/assets/9403403/9bf0bab5-b7ee-4161-96a6-23e76ddb56b4">here</a>. |

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="LICENSE">
    <img src="https://img.shields.io/github/license/nextstrain/nextclade" alt="License" />
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
  <a href="https://app.circleci.com/pipelines/github/nextstrain/nextclade?branch=master">
    <img src="https://img.shields.io/circleci/build/github/nextstrain/nextclade/master?label=build%3Amaster" alt="CircleCI master branch">
  </a>

  <a href="https://app.circleci.com/pipelines/github/nextstrain/nextclade?branch=staging">
    <img src="https://img.shields.io/circleci/build/github/nextstrain/nextclade/staging?label=build%3Astaging" alt="CircleCI staging branch">
  </a>

  <a href="https://app.circleci.com/pipelines/github/nextstrain/nextclade?branch=release">
    <img src="https://img.shields.io/circleci/build/github/nextstrain/nextclade/release?label=build%3Arelease" alt="CircleCI release branch">
  </a>

  <a href="https://app.circleci.com/pipelines/github/nextstrain/nextclade?branch=release-cli">
    <img src="https://img.shields.io/circleci/build/github/nextstrain/nextclade/release-cli?label=build%3Arelease-cli" alt="CircleCI release-cli branch">
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

<p align="center">
  <a href="https://anaconda.org/bioconda/nextclade">
    <img
      src="https://anaconda.org/bioconda/nextclade/badges/version.svg"
      alt="Nextclade"
    />
  </a>

  <a href="https://usegalaxy.eu/root?tool_id=nextclade">
    <img
      src="https://img.shields.io/badge/usegalaxy-.eu-brightgreen?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAASCAYAAABB7B6eAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAACC2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjE8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgICAgIDx0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb24+MjwvdGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KD0UqkwAAAn9JREFUOBGlVEuLE0EQruqZiftwDz4QYT1IYM8eFkHFw/4HYX+GB3/B4l/YP+CP8OBNTwpCwFMQXAQPKtnsg5nJZpKdni6/6kzHvAYDFtRUT71f3UwAEbkLch9ogQxcBwRKMfAnM1/CBwgrbxkgPAYqlBOy1jfovlaPsEiWPROZmqmZKKzOYCJb/AbdYLso9/9B6GppBRqCrjSYYaquZq20EUKAzVpjo1FzWRDVrNay6C/HDxT92wXrAVCH3ASqq5VqEtv1WZ13Mdwf8LFyyKECNbgHHAObWhScf4Wnj9CbQpPzWYU3UFoX3qkhlG8AY2BTQt5/EA7qaEPQsgGLWied0A8VKrHAsCC1eJ6EFoUd1v6GoPOaRAtDPViUr/wPzkIFV9AaAZGtYB568VyJfijV+ZBzlVZJ3W7XHB2RESGe4opXIGzRTdjcAupOK09RA6kzr1NTrTj7V1ugM4VgPGWEw+e39CxO6JUw5XhhKihmaDacU2GiR0Ohcc4cZ+Kq3AjlEnEeRSazLs6/9b/kh4eTC+hngE3QQD7Yyclxsrf3cpxsPXn+cFdenF9aqlBXMXaDiEyfyfawBz2RqC/O9WF1ysacOpytlUSoqNrtfbS642+4D4CS9V3xb4u8P/ACI4O810efRu6KsC0QnjHJGaq4IOGUjWTo/YDZDB3xSIxcGyNlWcTucb4T3in/3IaueNrZyX0lGOrWndstOr+w21UlVFokILjJLFhPukbVY8OmwNQ3nZgNJNmKDccusSb4UIe+gtkI+9/bSLJDjqn763f5CQ5TLApmICkqwR0QnUPKZFIUnoozWcQuRbC0Km02knj0tPYx63furGs3x/iPnz83zJDVNtdP3QAAAABJRU5ErkJggg=="
      alt="European Galaxy server"
    />
  </a>

</p>

<p align="center">

  <a href="packages/web/package.json">
    <img
      src="https://img.shields.io/github/package-json/v/nextstrain/nextclade/master/packages_rs/nextclade-web?label=web&logo=npm"
      alt="package.json version"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/releases">
    <img src="https://img.shields.io/github/v/release/nextstrain/nextclade?logo=github&label=cli" alt="GitHub releases">
  </a>

  <a href="https://hub.docker.com/r/nextstrain/nextalign">
      <img alt="Nextclade Docker image version" src="https://img.shields.io/docker/v/nextstrain/nextclade?label=%F0%9F%90%8B%20%20%20docker%3Anextalign">
  </a>

  <a href="https://hub.docker.com/r/nextstrain/nextclade">
      <img alt="Nextclade Docker image version" src="https://img.shields.io/docker/v/nextstrain/nextclade?label=%F0%9F%90%8B%20%20%20docker%3Anextclade">
  </a>

</p>

<p align="center">

  <a style="border-width:0" href="https://doi.org/10.21105/joss.03773">
    <img src="https://joss.theoj.org/papers/10.21105/joss.03773/status.svg" alt="JOSS publication" >
  </a>

</p>

---

<p align="center">
  <a href="https://clades.nextstrain.org" target="_blank" rel="noopener noreferrer" >
    <img height="50px"
      src="https://img.shields.io/badge/%F0%9F%8C%8E%20Visit%20clades.nextstrain.org-%23aa1718.svg"
      alt="Visit clades.nextstrain.org button"
    />
  </a>
</p>

<p align="center">

  <a href="https://docs.nextstrain.org/projects/nextclade/en/latest/">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%93%97%20Documentation-%231773B2.svg"
      alt="Documentation button"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%93%A2%20Report%20Issue-%2317992a.svg"
      alt="Report issue button"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="30px"
      src="https://img.shields.io/badge/%E2%9C%A8%20Request%20feature-%2317992a.svg"
      alt="Request feature button"
    />
  </a>

  <a href="https://discussion.nextstrain.org">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%92%AC%20Join%20discussion-%23d99852.svg"
      alt="Discuss button"
    />
  </a>
</p>

<h2 id="citation" align="center">
📜️ Citation
</h2>

If you use results obtained with Nextclade in a publication, please

 - cite our paper:

    > Aksamentov, I., Roemer, C., Hodcroft, E. B., & Neher, R. A., (2021). Nextclade: clade assignment, mutation calling and quality control for viral genomes. Journal of Open Source Software, 6(67), 3773, https://doi.org/10.21105/joss.03773

   ([bibtex](https://clades.nextstrain.org/citation.bib))

 - where possible, provide a link to Nextclade Web:

    > https://clades.nextstrain.org


<h2 id="documentation" align="center">
📗 Documentation
</h2>

 - Documentation for Nextclade: https://docs.nextstrain.org/projects/nextclade
 - Documentation for the parent project, Nextstrain: https://docs.nextstrain.org


<h2 id="documentation" align="center">
🧑‍💻 Development
</h2>

Read developer guide here: [docs/dev/developer-guide.md](docs/dev/developer-guide.md)

<h2 id="team" align="center">
 ✨ Team
</h2>

<p>
Nextclade is a part of
<a target="_blank" rel="noopener noreferrer" href="https://nextstrain.org">
<img height="15px"
  src="https://github.com/nextstrain/nextclade/blob/master/docs/assets/nextstrain_logo.svg"
  alt="Nextstrain logo"
/>
<span> </span>
<span>Nextstrain project</span>
</a>.</p>


It is maintained by:

<p align="center">
<table>
<tr>
<td>
  <p align="center">
    <a href="https://github.com/ivan-aksamentov">
      <img alt="" src="https://avatars.githubusercontent.com/u/9403403?s=100&&v=4" width="100px;" />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/ivan-aksamentov">Ivan Aksamentov</a>
  </p>

  <p align="center">
    <small>Senior Software Engineer</small><br />
    <small>NeherLab, Biozentrum, University of Basel</small><br />
    <small>Swiss Institute of Bioinformatics</small><br />
  </p>
</td>

<td>
  <p align="center">
    <a href="https://github.com/rneher">
      <img alt="" src="https://avatars.githubusercontent.com/u/8379168?s=100&&v=4" width="100px;" />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/rneher">Richard Neher</a>
  </p>

  <p align="center">
    <small>Principal Investigator</small><br />
    <small>NeherLab, Biozentrum, University of Basel</small><br />
    <small>Swiss Institute of Bioinformatics</small><br />
  </p>
</td>

<td>
  <p align="center">
    <a href="https://github.com/corneliusroemer">
      <img alt="" src="https://avatars.githubusercontent.com/u/25161793?s=100&&v=4" width="100px;" />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/corneliusroemer">Cornelius Roemer</a>
  </p>

  <p align="center">
    <small>Staff Scientist</small><br />
    <small>NeherLab, Biozentrum, University of Basel</small><br />
    <small>Swiss Institute of Bioinformatics</small><br />
  </p>
</td>
</tr>
</table>
</p>


We are thankful to all our contributors, no matter how they contribute: in ideas, science, code, documentation or otherwise. Thanks goes to these people (<a target="_blank" rel="noopener noreferrer" href="https://allcontributors.org/docs/en/emoji-key">emoji key</a>):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="12.5%"><a href="https://github.com/emmahodcroft"><img src="https://avatars1.githubusercontent.com/u/14290674?v=4?s=100" width="100px;" alt="Emma Hodcroft"/><br /><sub><b>Emma Hodcroft</b></sub></a><br /><a href="#ideas-emmahodcroft" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/nextstrain/nextclade/commits?author=emmahodcroft" title="Tests">⚠️</a> <a href="#talk-emmahodcroft" title="Talks">📢</a> <a href="https://github.com/nextstrain/nextclade/pulls?q=is%3Apr+reviewed-by%3Aemmahodcroft" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="12.5%"><a href="https://github.com/anna-parker"><img src="https://avatars.githubusercontent.com/u/50943381?v=4?s=100" width="100px;" alt="Anna Parker"/><br /><sub><b>Anna Parker</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=anna-parker" title="Code">💻</a> <a href="https://github.com/nextstrain/nextclade/commits?author=anna-parker" title="Tests">⚠️</a> <a href="#ideas-anna-parker" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="12.5%"><a href="https://tsibley.net/"><img src="https://avatars2.githubusercontent.com/u/79913?v=4?s=100" width="100px;" alt="Thomas Sibley"/><br /><sub><b>Thomas Sibley</b></sub></a><br /><a href="#infra-tsibley" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#security-tsibley" title="Security">🛡️</a></td>
      <td align="center" valign="top" width="12.5%"><a href="https://github.com/victorlin"><img src="https://avatars2.githubusercontent.com/u/13424970?v=4?s=100" width="100px;" alt="Victor Lin"/><br /><sub><b>Victor Lin</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=victorlin" title="Code">💻</a> <a href="https://github.com/nextstrain/nextclade/commits?author=victorlin" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="12.5%"><a href="http://theo.io/"><img src="https://avatars.githubusercontent.com/u/19732295?v=4?s=100" width="100px;" alt="Theo Sanderson"/><br /><sub><b>Theo Sanderson</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=theosanderson" title="Code">💻</a></td>
      <td align="center" valign="top" width="12.5%"><a href="http://www.natalieastroud.com/"><img src="https://avatars3.githubusercontent.com/u/17433156?v=4?s=100" width="100px;" alt="Natalie Stroud"/><br /><sub><b>Natalie Stroud</b></sub></a><br /><a href="#content-stroudn1" title="Content">🖋</a> <a href="#translation-stroudn1" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="12.5%"><a href="http://www.rubinsteyn.com/"><img src="https://avatars.githubusercontent.com/u/48441?v=4?s=100" width="100px;" alt="Alex Rubinsteyn"/><br /><sub><b>Alex Rubinsteyn</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=iskandr" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="12.5%"><a href="https://github.com/molecules"><img src="https://avatars.githubusercontent.com/u/345060?v=4?s=100" width="100px;" alt="Christopher Bottoms"/><br /><sub><b>Christopher Bottoms</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=molecules" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="12.5%"><a href="http://finlaymagui.re/"><img src="https://avatars.githubusercontent.com/u/1698629?v=4?s=100" width="100px;" alt="Finlay Maguire"/><br /><sub><b>Finlay Maguire</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=fmaguire" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="12.5%"><a href="https://github.com/dnanto"><img src="https://avatars.githubusercontent.com/u/49757922?v=4?s=100" width="100px;" alt="dnanto"/><br /><sub><b>dnanto</b></sub></a><br /><a href="https://github.com/nextstrain/nextclade/commits?author=dnanto" title="Code">💻</a> <a href="#data-dnanto" title="Data">🔣</a></td>
    </tr>
  </tbody>
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

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="../../LICENSE" alt="License file">MIT License</a>
</p>
