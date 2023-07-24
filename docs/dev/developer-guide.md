# Developer guide

This guide describes how to setup a development environment for building and running

- Nextclade CLI executable
- Nextalign CLI executable
- Nextclade Web and Nextclade WebAssembly module

## Developing locally

### Nextclade CLI and Nextalign CLI

Nextclade CLI and Nextalign CLI are written in Rust. The usual `rustup` & `cargo` workflow can be used:

```bash
# Clone Nextclade git repository
git clone https://github.com/nextstrain/nextclade
cd nextclade

# Install Rustup, the Rust version manager (https://www.rust-lang.org/tools/install)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Rust tools to the $PATH
export PATH="$PATH:$HOME/.cargo/bin"

# [Linux only] install openssl and pkgconfig. Example for Ubuntu:
sudo apt-get update
sudo apt-get install --yes libssl-dev pkg-config

# Prepare dotenv file with default values
cp .env.example .env

# Build Nextclade and use it to download a dataset to ./data_dev/
# In later commands, a dataset is expected to be in ./data_dev/, refer to Nextclade dataset information 
# (https://docs.nextstrain.org/projects/nextclade/en/stable/user/datasets.html#download-a-dataset)
cargo run --bin=nextclade -- dataset \
  get --name=sars-cov-2 \
  --output-dir=data_dev/

# Build and run Nextclade in debug mode (convenient for development, fast to build, slow to run, has debug info)
# Refer to the user documentation for explanation of Nextclade CLI flags (https://docs.nextstrain.org/projects/nextclade/en/stable/)
cargo run --bin=nextclade -- run \
  data_dev/sequences.fasta \
  --input-dataset=data_dev/ \
  --output-fasta='out/nextclade.aligned.fasta' \
  --output-tsv='out/nextclade.tsv' \
  --output-tree='out/nextclade.tree.json' \
  --in-order \
  --include-reference

# Build Nextclade in release mode (slow to build, fast to run, no debug info)
cargo build --release --bin=nextclade

# Run Nextclade release binary
./target/release/nextclade run \
  data_dev/sequences.fasta \
  --input-dataset=data_dev/ \
  --output-fasta='out/nextclade.aligned.fasta' \
  --output-tsv='out/nextclade.tsv' \
  --output-tree='out/nextclade.tree.json' \
  --in-order \
  --include-reference

# Add -v flags to increase verbosity of output
# nextclade run ... -vv

# To build Nextalign, replace 'nextclade' with 'nextalign'
# cargo build --release --bin=nextalign

```

### Nextclade Web

Nextclade Web is a React Typescript application, which relies on Nextclade WebAssembly (wasm) module to perform the computation.
The WebAssembly module shares the algorithms Rust code with Nextclade CLI. So building Nextclade Web involves 2 steps: building WebAssembly module and building the app itself.

Install Node.js version 14+ (latest LTS release is recommended), by either downloading it from the official website: https://nodejs.org/en/download/, or by using [nvm](https://github.com/nvm-sh/nvm). We don't recommend using Node.js from the package manager of your operating system, and neither from conda or other sources.

Let's build the WebAssembly module:

<details>
<summary>Show extra requirements for macOS</summary>

For macOS, you will also have to install llvm: 

```bash
brew install llvm
```

Furthermore, you will need to set the following environment variables before invoking `yarn wasm-prod`:

```bash
export CC=/opt/homebrew/opt/llvm/bin/clang
export AR=/opt/homebrew/opt/llvm/bin/llvm-ar 
```
</details>

```bash
# Clone Nextclade git repository
git clone https://github.com/nextstrain/nextclade
cd nextclade

# Install Rustup, the Rust version manager (https://www.rust-lang.org/tools/install)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Rust tools to the $PATH
export PATH="$PATH:$HOME/.cargo/bin"

# Prepare dotenv file with default values
cp .env.example .env

# Install wasm-pack
cargo install wasm-pack
cargo install wasm-opt

cd packages_rs/nextclade-web

# Install dependency packages
yarn install

# Run wasm-pack to build the WebAssembly module in release mode
yarn wasm-prod

# Alternatively, to build in debug mode (much much slower to run, but more debug info)
# yarn wasm-dev

```

The WebAssembly module and accompanying Typescript code should have been generated into `packages_rs/nextclade-web/src/gen/`,
and now the web app should be able to find it.

Let's build build and run the web app (it's convenient to do it in a separate terminal instance from WebAssembly module build):

```bash
# Build and run web app in dev mode
cd packages_rs/nextclade-web
yarn install
yarn dev
```

Open `http://localhost:3000/` in the browser. Code changes should trigger rebuild and fast refresh of the app.

The optimized production version of the web app can be built with

```bash
yarn prod:build
yarn prod:serve
```

Open `http://localhost:8080/` in the browser.

The resulting files should be available under `packages_rs/nextclade-web/.build/production/web`. They can be served by any static webserver or static file hosting (`https://clades.nextstrain.org` uses AWS S3 + Cloudfront). `yarn prod:serve` is just an example of a simple webserver that serves files locally.

### Linting (static analysis)

#### Linting Rust code

Rust code is linted with [Clippy](https://github.com/rust-lang/rust-clippy):

```bash
cargo clippy
```

Automatic fixes can be applied using:

```bash
cargo clippy --fix
```

Clippy is configured in `clippy.toml` and in `.cargo/config.toml`.

For routine development, it is recommended to configure your text editor to see the Rust compiler and linter errors.

##### In [VSCode](https://code.visualstudio.com/):

Make sure you have ["Rust Analyzer" extension](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) (and not deprecated "Rust" extension), and configure it to use clippy: hit Ctrl+Shit+P, then find "Preferences: Open user settings (JSON)", then add:

```
"rust-analyzer.check.command": "clippy",
```

Now the warnings and errors will be shown as yellow and red squiggles. If you mouse hover a squiggle, there will appear a tooltip with explanation and a link to even more details. Sometimes there will be a link in the bottom of the tooltip to apply a "Quick fix" for this particular mistake. And there is also a light bulb in the editor to do the same.

You can disable the pesky inline type hints (for all languages) by adding this to your preferences JSON:

```
"editor.parameterHints.enabled": false,
"editor.inlayHints.enabled": "off",
```

An extension ["Error lens"](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) allows to see error and warning text inline in the editor.

##### In Intellij CLion:

In main menu, "File | Settings | Languages & Frameworks | Rust | External Linters", set "External tool" to "Clippy" and check the checkbox "Run external linter to analyze code on the fly".


#### Linting Typescript and JavaScript

The web app is linted using [eslint](https://github.com/eslint/eslint) and [tsc](https://www.typescriptlang.org/docs/handbook/compiler-options.html) as a part of development command, but the same lints also be run separately:

```bash
cd packages_rs/nextclade-web
yarn lint
```

The `eslint` configuration is in `.eslintrc.js`. `tsc` configuration is in `tsconfig.json`.

### Formatting (code style)

```bash
cargo fmt --all
```

```bash
cd packages_rs/nextclade-web
yarn format:fix
```



## Trying custom datasets locally

### Prepare and serve datasets locally

- Build a fresh dataset directory as described in the [nextstrain/nextclade_data](https://github.com/nextstrain/nextclade_data) repo. At the time of writing it simply means to run `./scripts/rebuild` and to observe the `data_output/` created, containing the dataset files and associated index files
- Serve datasets directory locally using any static file server. [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) should be enabled on the server. For example, using `serve` package from NPM:
  ```bash
  npx serve@latest --cors --listen=tcp://0.0.0.0:27722 data_output/
  ```
  In this example, files should be available at
  ```
  http://localhost:27722/
  ````
  in particular, you should be able to download `index_v2.json` using

  ```bash
  curl http://localhost:27722/index_v2.json
  ```
  or when navigating to this address in the browser.

### Temporarily use custom dataset server with Nextclade CLI

Run the usual `dataset list` and dataset `get commands`, with an additional flag:

```
--server=http://localhost:27722
```

This will tell Nextclade to use the local server for dataset queries.

### Temporarily use custom dataset server with Nextclade Web

Add the `dataset-server` URL parameter with value set to URL of the custom dataset server:

```url
https://clades.nextstrain.org?dataset-server=http://example.com
```

Local URLs should also work:

```url
https://clades.nextstrain.org?dataset-server=http://localhost:27722
```

> ⚠️The linked resources should be available for fetching by a web browser on the client machine. Make sure [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled on your file server as well as that all required authentication (if any) is included into the file URL itself.

> ⚠️The URLs might get quite complex, so don't forget to [encode the special characters](https://en.wikipedia.org/wiki/Percent-encoding), to keep the URLs valid.


### Permanently configure Nextclade CLI and Nextclade Web to use custom dataset server

Open `.env` file in the root of the project (if you don't have it, create it based on `.env.example`) and set the `DATA_FULL_DOMAIN` variable to the address of your local dataset server. In the example above it would be:

```
DATA_FULL_DOMAIN=http://localhost:27722
```

Rebuild Nextclade CLI and it will use this address by default for all dataset requests (without need for the additional `--server` flag).

Rebuild Nextclade Web and it will use this address by default for all dataset requests (without need for the additional `dataset-server` URL parameter).

Note that this address will be baked into the CLI binaries or into the Web app permanently. Switch to the default value and rebuild to use the default dataset server deployment again.

Any network location can be used, not only localhost.

The same mechanism is used during CI builds for master/staging/production environments, to ensure they use their corresponding dedicated dataset server.


## Maintenance

There are 2 release targets, which are released and versioned separately:

- CLI (Nextclade CLI and Nextalign CLI are released together)
- Web application

### Versioning

Nextclade project tries hard to adhere to [Semantic Versioning 2.0.0](https://semver.org/)

### Releasing new CLI version

- Checkout the branch and commit you want to release. Theoretically, you can release any commit, but be nice and stick to releases from master.
- If you are making a stable release, make sure to fill the CHANGELOG.md and commit changes to your branch. Pay particular attention to headings: CI will extract the text between the two first `##` headings, in a very silly way, and will use this text as release notes on GitHub Releases.
- Make sure there are no uncommitted changes.
- Follow comments in the script `./scripts/releases` on how to install dependencies for this script.
- Run `./scripts/releases cli <bump_type>`, where `bump_type` signifies by how much you want to increment the version. It should be one of: `major`, `minor`, `patch`, `rc`, `beta`, `alpha`. Note that `rc`, `beta` and `alpha` will make a prerelease, that is - marked as "prerelease" on GitHub Releases and not overwriting "latest" tags on DockerHub.
- Verify the changes the script applied:
  - versions are bumped as you expect in all Cargo.toml and Cargo.lock files.
  - a local commit created on branch `release-cli` with a message containing the version number that you expect
- The script will ask if you want to push the changes. This is the last step. If you agree, then the changes will be pushed to GitHub and CI will start a build. You can track it [here](https://app.circleci.com/pipelines/github/nextstrain/nextclade). If you refuse this step, you can still push later.

### Releasing new Web version

- There are 3 websites exist, for master, staging and release environments. They map to master, staging and release git branches. Pick an environment you want to deploy the new version to and checkout the corresponding branch.
- If you are deploying to release, make sure to fill the CHANGELOG.md and commit changes to your branch. Pay particular attention to headings: CI will extract the text between the two first `##` headings, in a very silly way, and will use this text as release notes on GitHub Releases.
- Make sure there are no uncommitted changes.
- Follow comments in the script `./scripts/releases` on how to install dependencies for this script.
- Run `./scripts/releases web <bump_type>`, where `bump_type` signifies by how much you want to increment the version. It should be one of: `major`, `minor`, `patch`, `rc`, `beta`, `alpha`. It is advised against releasing `rc`, `beta`, `alpha` to release environment.


If you want to deploy the same version to multiple environments, then release to one environment (on one branch) and then promote it to other environments: manually fast-forward other branch(es) to this commit and push.
