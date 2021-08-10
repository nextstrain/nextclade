# Developer's guide: Nextclade Web

This guide describes how to setup a development environment for building and running Nextclade Web Application, how to contribute to Nextclade frontend and WebAssembly module, maintain, release and deploy the Nextclade web application.

If you are interested in developing Nextclade CLI or Nextalign CLI, see: ["Developer's guide: Nextclade CLI and Nextalign CLI"](../../docs/dev/developers-guide-cli.md).

<h3 id="implementation-notes" align="center">
🧠 Implementation notes
</h3>

Nextclade Web is implemented as a single-page web application, based on Next.js

Nextclade Web runs its algorithms in WebWorkers. These WebWorkers instantiate and run a WebAssembly module, written C++. Both, the web application and the  WebAssembly module need to be built in order for Nextclade to function, and these are the 2 separate build steps.

Most of the code and the build system of the WebAssembly module is shared with the CLI modules. See  ["Developer's guide: Nextclade CLI and Nextalign CLI"](../../docs/dev/developers-guide-cli.md) for more details.

There is a convenience Makefile in the root of the project that launches the build scripts. These scripts are used by project maintainers for the routine development and maintenance as well as by the continuous integration system.

The easiest way to start the development is to use the included docker container option, described in the next section. The same environment can, of course, be setup on a local machine, but that requires some manual steps, also described further.

## Development build, with Docker (recommended)

### Requirements:

 - docker
 - bash
 - coreutils
 - make

### Steps

Clone the repository and enter the root directory of the project

    git clone --recursive https://github.com/nextstrain/nextclade
    cd nextclade

Build the WebAssembly module in dev mode

    make docker-dev-wasm

Wait for build to finish (the message "Done" should be printed to console).

In a separate console instance build the web application:

    make docker-dev-web

This will trigger the development server and build process. Wait for the build to finish, then navigate to `http://localhost:3000` in a browser. Both commands will watch the relevant source files and rebuild on changes.


## Development build, local

### Requirements:

- all of the requirements from ["Developer's guide: Nextclade CLI and Nextalign CLI"](../../docs/dev/developers-guide-cli.md)

- <a target="_blank" rel="noopener noreferrer" href="https://git-scm.com/downloads">Git</a> >= 2.0

- <a target="_blank" rel="noopener noreferrer" href="https://nodejs.org/">Node.js</a> >= 12 (we recommend latest LTS version and installation through <a target="_blank" rel="noopener noreferrer" href="https://github.com/nvm-sh/nvm">nvm</a> or
  <a target="_blank" rel="noopener noreferrer" href="https://github.com/coreybutler/nvm-windows">nvm-windows</a>)

- 1.0 < yarn < 2.0


### Steps

Clone the repository and enter the root directory of the project

    git clone --recursive https://github.com/nextstrain/nextclade
    cd nextclade

Build the WebAssembly module in dev mode

    make dev-wasm

Wait for build to finish (the message "Done" should be printed to console).

In a separate console instance build the web application:

    make dev-web

This will trigger the development server and build process. Wait for the build to finish, then navigate to `http://localhost:3000` in a browser. Both commands will watch the relevant source files and rebuild on changes.


### Production build

TODO


### Deployment

TODO
