# Developer guide

This guide describes:

- how to download source code for Nextclade CLI and Nextclade Web
- how to setup a development environment
- how to build and run Nextclade CLI and Nextclade Web
- how the official distributions are maintained, released and deployed

This is only useful if you know programming at least a little or is curious about how Nextclade is built.

> ⚠️ If you are Nextclade user or is looking to familiarize yourself with Nextclade usage and features, then refer to [Nextclade user documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/index.html) instead.

> ⚠️ This guide assumes basic familiarity with Nextclade Web and/or Nextclade CLI as well as certain technical skills.

> ⚠️ Datasets are managed in a [separate repository](https://github.com/nextstrain/nextclade_data)

## Developing locally

### Nextclade CLI

Nextclade CLI is written in Rust programming language. The usual `rustup` & `cargo` workflow can be used.

If you are not familiar with Rust, please refer to official documentation:

- [Rust](https://www.rust-lang.org) - the programming language itself
- [Rust: learn](https://www.rust-lang.org/learn) - official learning materials: The Rust book, The Ruststligs course, examples.
- [Rustup](https://rust-lang.github.io/rustup/) - Rust toolchain installer and version manager
- [Cargo](https://doc.rust-lang.org/cargo/) - Rust package manager

as well as to the `--help` text for each tool.

#### Steps

1. Obtain source code (once)

   Make sure you have [git](https://git-scm.com/) installed.

   Clone Nextclade git repository:

   ```bash
   git clone https://github.com/nextstrain/nextclade
   cd nextclade
   ```

   > 💡 We accept pull requests on GitHub. If you want to submit a new feature or a bug fix, then create a GitHub account, [make a fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) of the [origin repository `nextstrain/nextclade`](https://github.com/nextstrain/nextclade) and clone your forked repository instead. Refer to [GitHub documentation "Contributing to projects"](https://docs.github.com/en/get-started/quickstart/contributing-to-projects) for more details.

   > 💡 Make sure you [keep your local code up to date](https://github.com/git-guides/git-pull) with the origin repo,  [especially if it's forked](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork).

   > 💡 If you are a member of Nextstrain team, then you don't need a fork and you can contribute directly to the origin repository. Still, in most cases, please submit pull requests for review, rather than pushing changes to major branches directly.

2. Install Rust if not already (once) ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)):

   This step is the same as for Nextclade CLI (see above). You can skip this step if you've done the setup for Nextclade CLI already.

   The only supported Rust version is the one declared in [`rust-toolchain.toml`](https://github.com/nextstrain/nextclade/blob/master/rust-toolchain.toml). It may change in the future.

    ```bash
    # [once] Install Rustup, the Rust version manager
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    
    # [once] Add Rust tools to the $PATH
    export PATH="$PATH:$HOME/.cargo/bin"
    
    # [once] [Linux only] install openssl and pkgconfig. Example for Ubuntu:
    sudo apt-get update
    sudo apt-get install --yes libssl-dev pkg-config
    
    # Check your installed versions of Rust compiler, Cargo and Rustup
    $ rustc -V
    $ cargo -V
    $ rustup -V
    ```

   > ⚠️ Nextclade team doesn't have bandwidth to support Rust installations deviating from the [officially recommended steps](https://doc.rust-lang.org/book/ch01-01-installation.html) and Rust versions different from what is declared in [rust-toolchain.toml](https://github.com/nextstrain/nextclade/blob/master/rust-toolchain.toml). If you install Rust from Linux package repositories, Homebrew, Conda etc., things may or may not work, or they may work but produce wrong results. Nextclade team doesn't have bandwidth to try every platform and config, so if you decide to go unofficial route, then you are on your own. But feel free to open pull requests if fixes are necessary to make your setup work.

   > 💡 Note, Rustup allows to install multiple versions of Rust and to switch between them. This repository contains a [rust-toolchain.toml](https://github.com/nextstrain/nextclade/blob/master/rust-toolchain.toml) file, which describes which version of Rust is currently in use by Nextclade official build. Cargo and Rustup should be able to [pick it up automatically](https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file), install the required toolchain and use it when you type `cargo` commands. Any other versions of Rust toolchain are not supported.

3. Prepare environment variables (once). They configure Nextclade build-time settings. Optionally adjust the variables in the `.env` file to your needs.

    ```bash
    # [once] Prepare dotenv file with default values
    cp .env.example .env
    ```

4. Build and run Nextclade CLI in debug mode (convenient for development - faster to build, slow to run, has more debug info in the executable, error messages are more elaborate):

    ```bash
    # (Re-)build Nextclade in debug mode.
    # By default, the resulting executable will be in `target/debug/nextclade`.
    cargo build --bin=nextclade

    # (Re-)build Nextclade in debug mode and run `nextclade --help` to print 
    # Nextclade CLI main help screen. The arguments after the `--` are passed 
    # to nextclade executable, as if you'd run it directly.
    # Refer to Nextclade user documentation for explanation of arguments.
    cargo run --bin=nextclade -- --help

    # (Re-)build Nextclade in debug mode and use it to download a dataset to 
    # `data_dev/` directory.
    cargo run --bin=nextclade -- dataset get \
      --name='sars-cov-2' \
      --output-dir='data_dev/sars-cov-2'

    # (Re-)build Nextclade in debug mode and run the analysis using the 
    # dataset we just downloaded (to `data_dev/`) and output results to 
    # the `out/` directory.
    cargo run --bin=nextclade -- run \
      'data_dev/sars-cov-2/sequences.fasta' \
      --input-dataset='data_dev/sars-cov-2/' \
      --output-all='out/'
    ```

   The `cargo run` command automatically performs the `cargo build` command if there are code changes.

   > 💡 Note, depending on your computer hardware and internet speed, your first build can take significant amount of time, because the necessary Rust toolchain version and all dependency packages (crates) will be downloaded and compiled. Next time the existing toolchain and cached packages are used, so the repeated builds should be much faster.

   > 💡 Add `-v` to Nextclade arguments to make console output more verbose. Add more occurrences, e.g. `-vv`, for even more verbose output.

5. Build and run Nextclade CLI in release mode (slow to build, fast to run, very little debug info):

    ```bash
    # Build Nextclade in release mode.
    # By default, the resulting executable will be in `target/release/nextclade`.
    cargo build --bin=nextclade --release
    
    # Run Nextclade release binary
    ./target/release/nextclade run \
      'data_dev/sars-cov-2/sequences.fasta' \
      --input-dataset='data_dev/sars-cov-2/' \
      --output-all='out/'
    
    ```

   > 💡 Debug builds are incremental, i.e. only the files that have changed since the last build are compiled, which is much faster that full build. But release builds are always full builds, with additional optimization passes, so they take much more time. If you need to quickly iterate on features, then use debug builds. If you are measuring performance, or building binaries for the actual daily usage, always use release builds.

### Nextclade Web

Nextclade Web is a React & Typescript application, which relies on Nextclade WebAssembly (wasm) modules to perform the computation. These WebAssembly modules share Rust code with Nextclade CLI. So building Nextclade Web involves 2 steps:

- building WebAssembly modules (the algorithms "backend")
- building the web application itself (the frontend)

Note that there is no actual programmable backend server. Nextclade Web is a static application which can be deployed to any static web hosting. Instead of the backend server, the frontend communicates with the WebAssembly module which is deployed into a pool of WebWorkers running directly in the user's browser.

#### Steps

1. Obtain source code (once)

   Make sure you have [git](https://git-scm.com/) installed.

   Clone Nextclade git repository:

    ```bash
    git clone https://github.com/nextstrain/nextclade
    cd nextclade
    ```

   > 💡 We accept pull requests on GitHub. If you want to submit a with new feature or a bug fixe, then make a GitHub account, [make a fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) of the [origin Nextclade repository](https://github.com/nextstrain/nextclade) and clone your forked repository instead. Refer to [GitHub documentation "Contributing to projects"](https://docs.github.com/en/get-started/quickstart/contributing-to-projects) for more details.

   > 💡 Make sure you [keep your local code up to date](https://github.com/git-guides/git-pull) with the origin repo,  [especially if it's forked](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork).

   > 💡 If you are a member of Nextstrain team, then you don't need a fork and you can contribute directly to the origin repository. Still, in most cases, please submit pull requests for review, rather than pushing changes to branches directly.

2. Install Node.js (once), by either downloading it from the official website: [nodejs.org](https://nodejs.org), or by using [nvm](https://github.com/nvm-sh/nvm).

   The only supported Node.js version is the one that is currently declared in the [`.nvmrc`](https://github.com/nextstrain/nextclade/blob/master/.nvmrc) file. It may change in the future.

   If you have `nvm` installed and configured, you can quickly install and switch to this Node.js version by navigating to the root of nextclade repository (where the [`.nvmrc`](https://github.com/nextstrain/nextclade/blob/master/.nvmrc) file is) and running:

    ```bash
    cd nextclade/
    nvm install
    nvm use
    node --version
    ```

   > ⚠️ Nextclade team doesn't have bandwidth to support Node.js installations from Linux package repositories, Homebrew, Conda, as well as versions of Node.js which are not the same as currently declared in the [`.nvmrc`](https://github.com/nextstrain/nextclade/blob/master/.nvmrc), and everything else deviating from the recommended setup. If you decide to go that route - things may or may not work - you are on your own. But feel free to open pull requests if fixes are necessary to make your setup work.

3. Install Rust if not already (once) ([https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)):

   This step is the same as for Nextclade CLI (see above). You can skip this step if you've done the setup for Nextclade CLI already.

   The only supported Rust version is the one declared in [`rust-toolchain.toml`](https://github.com/nextstrain/nextclade/blob/master/rust-toolchain.toml). It may change in the future.

    ```bash
    # [once] Install Rustup, the Rust version manager
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    
    # [once] Add Rust tools to the $PATH
    export PATH="$PATH:$HOME/.cargo/bin"
    
    # [once] [Linux only] install openssl and pkgconfig. Example for Ubuntu:
    sudo apt-get update
    sudo apt-get install --yes libssl-dev pkg-config
    
    # Check your installed versions of Rust compiler, Cargo and Rustup
    $ rustc -V
    $ cargo -V
    $ rustup -V
    ```

   > ⚠️ Nextclade team doesn't have bandwidth to support Rust installations deviating from the [officially recommended steps](https://doc.rust-lang.org/book/ch01-01-installation.html) and Rust versions different from what is declared in [rust-toolchain.toml](https://github.com/nextstrain/nextclade/blob/master/rust-toolchain.toml). If you install Rust from Linux package repositories, Homebrew, Conda etc., things may or may not work, or they may work but produce wrong results. Nextclade team doesn't have bandwidth to try every platform and config, so if you decide to go unofficial route, then you are on your own. But feel free to open pull requests if fixes are necessary to make your setup work.

   > 💡 Note, Rustup allows to install multiple versions of Rust and to switch between them. This repository contains a [rust-toolchain.toml](https://github.com/nextstrain/nextclade/blob/master/rust-toolchain.toml) file, which describes which version of Rust is currently in use by Nextclade official build. Cargo and Rustup should be able to [pick it up automatically](https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file), install the required toolchain and use it when you type `cargo` commands. Any other versions of Rust toolchain are not supported.

4. Prepare environment variables (once). They configure Nextclade build-time settings. Optionally adjust the variables in the `.env` file to your needs.

    ```bash
    cp .env.example .env
    ```

5. Install other required tools (once)

    ```bash
    cargo install wasm-pack
    ```

   <details>
   <summary>🍏 Extra requirements for macOS [click to expand]</summary>

   > For macOS, you will also have to install llvm:
   >
   > ```bash
   > brew install llvm
   > ```
   >
   > Furthermore, you will need to set the following environment variables before invoking `yarn wasm-prod`:
   >
   > ```bash
   > export CC=/opt/homebrew/opt/llvm/bin/clang
   > export AR=/opt/homebrew/opt/llvm/bin/llvm-ar
   > ```

    </details>

6. Install NPM dependencies (once)

    ```bash
    cd packages/nextclade-web
    yarn install
    ```

   > ⚠️ Nextclade uses `yarn` to manage NPM dependencies. While you could try `npm` or other tools instead, we don't support this.

7. Build the WebAssembly module

    ```bash
    cd packages/nextclade-web
    yarn wasm-prod
    ```

   This step might take a lot of time. The WebAssembly module and accompanying Typescript code should be been generated into  `packages/nextclade-web/src/gen/`. The web application should be able to find it there.

   Repeat this step every time you are changing Rust code.

8. Build and serve the development version of the web app locally

   We are going to run a development web server, which runs continuously (it does not yield terminal prompt until you stop it). It's convenient to do it in a separate terminal instance from WebAssembly module build to allow rebuilding the app and the module independently.

   The development version can be built using:

    ```bash
    cd packages/nextclade-web
    yarn dev
    ```

   This runs Next.js dev server (continuously). Open `http://localhost:3000/` in the browser. Typescript code changes should trigger automatic rebuild and fast refresh of the app in the browser - no dev server restart is typically necessary.

   Note that changes in Rust code (the algorithms) are not picked up automatically and the requirement rebuilding the WebAssembly module manually (as explained above). Once you rebuild the WebAssembly module in a separate terminal instance, the dev server should pick up the changes in the algorithms - no dev server restart is necessary.

9. Build and serve the production version of the web app locally

   Alternatively, the optimized ("production") version of the web app can be built and (optionally) served with

    ```bash
    yarn prod:build
    yarn prod:serve
    ```

   Open `http://localhost:8080/` in the browser.

   The resulting HTML, CSS, JS and WASM files should be available under `packages/nextclade-web/.build/production/web/`. This is the "web root" of the application. All files required to deploy and serve Nextclade Web are there.

   The production build does not have automatic rebuild and reload. You need to do full rebuild on every code change - both the WebAssembly module and then the web app.

   The `yarn prod:serve` command runs Express underneath and it is just an example of a simple (also slow and insecure) local file web server. But the produced files can be served using any static file web server (Apache, Nginx, Caddy, Express, etc.), static file hosting services, or cloud services (AWS S3, Vercel, GitHub Pages, etc.). The official deployment uses AWS S3 + Cloudfront.

### Internationalization (translation)

Nextclade Web is using `react-i18n` for internationalization. It is configured in [`packages/nextclade-web/src/i18n`](https://github.com/nextstrain/nextclade/tree/master/packages/nextclade-web/src/i18n). Note that parts of Auspice used in Nextclade are configured separately, but in the same directory.

The actual translations are in [`packages/nextclade-web/src/i18n/resources/`](https://github.com/nextstrain/nextclade/tree/master/packages/nextclade-web/src/i18n/resources).

For machine translation we use [`json-autotranslate`](https://www.npmjs.com/package/json-autotranslate), configured
in [`packages/nextclade-web/json-autotranslate.json`](https://github.com/nextstrain/nextclade/blob/master/packages/nextclade-web/json-autotranslate.json). It stores cache of strings in [`packages/nextclade-web/.json-autotranslate-cache/`](https://github.com/nextstrain/nextclade/blob/master/packages/nextclade-web/.json-autotranslate-cache).

#### Update machine translations

Use this script to extract strings apply machine translations:

```bash
# Extract English strings from the code of Nextclade Web.
# The result will be in `packages/nextclade-web/src/i18n/resources/en/`.
yarn i18n

# Deduplicate, correct, sort and otherwise 'massage' the extracted strings.
yarn i18n:fix

# Translate strings from English to all languages using json-autotranslate.
# Cached strings will be copied as is from cache. If a string is not present in cache,
# it will be machine translated using AWS Translate.
# This step requires AWS credentials (see json-autotranslate docs and ask your AWS admin).
i18n:translate

# 'Massage' the newly translated strings again.
yarn i18n:fix
```

#### Apply manual corrections

If you want to override machine translation, then edit the cached strings in [`packages/nextclade-web/.json-autotranslate-cache/`](https://github.com/nextstrain/nextclade/blob/master/packages/nextclade-web/.json-autotranslate-cache) and submit your changes in a pull request. Developers will check your changes and integrate them into the web app, by running:

```bash
# Deduplicate, correct, sort and otherwise 'massage' the extracted strings.
yarn i18n:fix

# Translate strings from English to all languages using json-autotranslate.
# Cached strings will be copied as is from cache. If a string is not present in cache,
# it will be machine translated using AWS Translate.
# This step requires AWS credentials (see json-autotranslate docs and ask your AWS admin).
i18n:translate

# 'Massage' the newly translated strings again.
yarn i18n:fix
```

Note that dev team does not necessarily understand all supported languages, so it cannot verify quality of either machine or human translations for most languages, except a few.

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

Clippy is configured in `clippy.toml` and in root `Cargo.toml`.

For routine development, it is recommended to configure your text editor to see the Rust compiler and linter errors.

<details>
<summary> 💡 In VSCode [click to expand]</summary>

(these instructions can go out of date with time, so make sure you check VSCode community for what's latest and greatest)

> Make sure you have ["Rust Analyzer" extension](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) (and not deprecated "Rust" extension), and configure it to use clippy: hit Ctrl+Shit+P, then find "Preferences: Open user settings (JSON)", then add:
>
> ```
> "rust-analyzer.check.command": "clippy",
> ```
>
> Now the warnings and errors will be shown as yellow and red squiggles. If you mouse hover a squiggle, there will appear a tooltip with explanation and a link to even more details. Sometimes there will be a link in the bottom of the tooltip to apply a "Quick fix" for this particular mistake. And there is also a light bulb in the editor to do the same.
>
> You can disable the pesky inline type hints (for all languages) by adding this to your preferences JSON:
>
> ```
> "editor.parameterHints.enabled": false,
> "editor.inlayHints.enabled": "off",
> ```
>
> An extension ["Error lens"](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) allows to see error and warning text inline in the editor.

</details>

<details>
<summary> 💡 In Jetbrains CLion [click to expand]</summary>

(these instructions can go out of date with time, so make sure you check Jetbrains docs for what's latest and greatest)


> Install [Intellij Rust plugin](https://intellij-rust.github.io/).
>
> In main menu, "File | Settings | Languages & Frameworks | Rust | External Linters", set "External tool" to "Clippy" and check the checkbox "Run external linter to analyze code on the fly".
>
> You should now see red and yellow squiggles if there are problems. Mouse hover to read the message and recommendations.
>
> Install [Inspection Lens plugin](https://plugins.jetbrains.com/plugin/19678-inspection-lens) to see the messages inline in the code.

</details>

<br/>

#### Linting Typescript and JavaScript

The web app is linted using [eslint](https://github.com/eslint/eslint) and [tsc](https://www.typescriptlang.org/docs/handbook/compiler-options.html) as a part of development command, but the same lints also be run separately:

```bash
cd packages/nextclade-web
yarn lint
```

The `eslint` configuration is in `.eslintrc.js`. `tsc` configuration is in `tsconfig.json`.

Modern text editors should be able to display ESLint warnings out of the box as soon as you install NPM dependencies (the `yarn install` command in the build steps). Refer to the documentation of you text editor if it does not.

### Formatting (code style)

#### Formatting Rust

We use `rustfmt` to format Rust code. It is installed during initial setup, along with the rest of dependencies. The configuration is in `rustfmt.toml`. You can fix the formatting using:

```bash
cargo fmt --all
```

Make sure your text editor is configured to use `rustfmt` for code formatting.

#### Formatting Typescript and JavaScript

We use `prettier` to format TS and JS code. It is installed during initial setup, along with the rest of dependencies. Configuration is in packages/nextclade-web/.prettierrc and in `.editorconfig`. You can fix the formatting using:

```bash
cd packages/nextclade-web
yarn format:fix
```

Make sure your text editor is [configured](https://prettier.io/docs/en/editors.html) to use `prettier` and to honor [editorconfig](https://editorconfig.org/) settings.

## Maintenance

### Continuous integration (CI)

Nextclade build and deployment process is automated using GitHub Actions:

- Nextclade Web build and deployment: [.github/workflows/web.yml](https://github.com/nextstrain/nextclade/blob/master/.github/workflows/web.yml)
- Nextclade CLI build and GitHub releases: [.github/workflows/cli.yml](https://github.com/nextstrain/nextclade/blob/master/.github/workflows/cli.yml)
- Nextclade CLI Bioconda release: [.github/workflows/bioconda.yml](https://github.com/nextstrain/nextclade/blob/master/.github/workflows/bioconda.yml)

The workflows run on every pull request on GitHub and every push to a major branch.

> Hint if the bioconda release job fails due to push permissions:
>
> You need to update the `nextstrain/bioconda` fork manually in order to be
>
> Clone the fork https://github.com/nextstrain/bioconda-recipes as described in the readme. Follow the instructions precisely, don't invent anything new. Then push the latest updates from the upstream to the fork with this command:
>
> ```
> cd biooconda-recipes && git push nextstrain bioconda/master:master
> ```
>
> Then go to the failing job and restart it.

### Deployment environments

Nextclade GitHub repository contains 3 major branches with special meaning: `master`, `staging` and `release`, each has a corresponding domain name for Nextclade Web. Nextclade built from one of these branches fetches datasets from the corresponding dataset deployment environment (See [Dataset server maintenance guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-server-maintenance.md))

Other branches are built in the context of GitHub pull requests. If you submit a pull request, then Vercel bot will automatically post a comment message with a URL to the preview deployment of Nextclade Web. After CLI GitHub Actions workflow finishes, you can find the resulting Nextclade CLI executables in the "Artifacts" section of the workflow.

Here is a list of environments:

| Nextclade repo branch | Nextclade Web domain name  | Dataset server                                                                                   | Meaning                                                                                                                   |
|-----------------------|----------------------------|--------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| release               | clades.nextstrain.org      | data.clades.nextstrain.org                                                                       | Final release, targeting all end users                                                                                    |
| staging               | staging.nextstrain.org     | data.staging.nextstrain.org                                                                      | Staging release, for last-minute testing and fixes before a final release is made, to not block progress on master branch |
| master                | master.nextstrain.org      | data.master.nextstrain.org                                                                       | Main development branch - accumulates features and bug fixes from pull requests                                           |
| other branches        | temporary domain on Vercel | branch with the same name in dataset GitHub repo if exists, otherwise data.master.nextstrain.org | Pull requests - development of new features and bug fixes                                                                 |

Preview versions of Nextclade Web built from pull requests will first try to fetch data from GitHub, from the branch with the same name in the [dataset GitHub repository](https://github.com/nextstrain/nextclade_data), if such branch exists. If not, then it will fetch from `master` environment. This is useful during development, when you need to modify both software and data: if you have branches with the same name in both repos, Nextclade Web will fetch the datasets from that branch.

Nextclade CLI built from pull requests in Nextclade repository is always using `master` deployment.

If you build Nextclade Web or Nextclade CLI locally, you can configure the data environment by setting `DATA_FULL_DOMAIN` variable in your local `.env` file. Note that despite the name, variable should contain fUll URL to the dataset server root. This is a build-time setting. You need to rebuild Nextclade every time you set it.

For example, for Nextclade v3 the default setting (`master` environment) is:

```
DATA_FULL_DOMAIN=https://data.master.clades.nextstrain.org/v3
```

You can serve datasets locally and tell Nextclade to use your local server:

```
DATA_FULL_DOMAIN=http://localhost:3001
```

You can turn on fetching from the same branch from the dataset repo by setting:

```
DATA_TRY_GITHUB_BRANCH=1
```

If you are deploying your own Nextclade instance, although it might be tempting to fetch datasets from GitHub directly, without deploying them to a file server, this is not recommended, because your users will probably hit GitHub's usage limits. i.e. we don't recommend to enable this setting for your major branches and end-user releases.

## Trying custom dataset server

There are multiple ways to make Nextclade to use a custom dataset server instead of the default one. This is useful for local testing, when developing datasets or Nextclade software itself.

In all cases you need to have a dataset server directory ready (contained datasets and all the required index files).

### Prepare and serve a dataset server directory locally

- Build a fresh dataset server directory as described in the [nextstrain/nextclade_data](https://github.com/nextstrain/nextclade_data) repo. At the time of writing it simply means to run `./scripts/rebuild` and to observe the `data_output/` directory created, containing the dataset files and associated index files

- Serve the output directory locally using any static file server. [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) should be enabled on the server. For example, using `serve` package from NPM:
  ```bash
  npx serve@latest --cors --listen=tcp://0.0.0.0:3001 data_output/
  ```

  Now you should be able to fetch dataset index file with `curl`:

  ```bash
  curl http://localhost:3001/index.json
  ```
  and to see some JSON when navigating to `http://localhost:3001/index.json` in a web browser.

### Temporarily use custom dataset server with Nextclade CLI

Run the usual `dataset list` and `dataset get`, with an additional flag:

```
--server=http://localhost:3001
```

This will tell Nextclade to use the local dataset server instead of the default one.

See Nextclade CLI user documentation for more details about available command ine arguments. You can type type `nextclade --help` for help screen. Each subcommand has it's own help screen, e.g `nextclade dataset get --help`.

### Temporarily use custom dataset server with Nextclade Web

To provide Nextclade with the alternative location of the dataset server, add the `dataset-server` URL parameter with value set to URL of the custom dataset server:

```
https://clades.nextstrain.org?dataset-server=http://example.com
```

Local URLs should also work:

```
https://clades.nextstrain.org?dataset-server=http://localhost:3001
```

Combining locally built Nextclade Web and local dataset server too:

```
https://localhost:3000?dataset-server=http://localhost:3001
```

This instructs Nextclade to disregard the default dataset server URL and fetch data and index files from this custom location instead.

> ⚠️ Web browser should be able to reach the dataset server address provided. Additionally, make sure [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled on your server as well as that all required authentication (if any) is included into the file URL itself.

> ⚠️The URLs might get quite complex, so don't forget to [encode special characters](https://en.wikipedia.org/wiki/Percent-encoding), to keep the URLs valid.

See Nextclade Web user documentation for more details about available URL parameters.

### Permanently configure Nextclade CLI and Nextclade Web to use custom dataset server

Open `.env` file in the root of the project (if you don't have it, create it based on `.env.example`) and set the `DATA_FULL_DOMAIN` variable to the address of your local dataset server. In the example above it would be:

```
DATA_FULL_DOMAIN=http://localhost:3001
```

Rebuild Nextclade CLI and it will use this address by default for all dataset requests (without need for the additional `--server` flag).

Rebuild Nextclade Web and it will use this address by default for all dataset requests (without need for the additional `dataset-server` URL parameter).

Note that this address will be baked into the CLI binaries or into the Web app permanently. Switch to the default value and rebuild to use the default dataset server deployment again.

Any network location can be used, not only localhost.

The same mechanism is used during CI builds for master/staging/production environments, to ensure they use their corresponding dedicated dataset server.

## Maintenance

There are 2 release targets, which are released and versioned separately:

- Nextclade CLI
- Nextclade Web

### Versioning

Nextclade project tries hard to adhere to [Semantic Versioning 2.0.0](https://semver.org/)

### Releasing

> ⚠️ We prefer to make releases on weekdays from Tuesday to Thursday, ideally around Wednesday in UTC zone, to ensure that everyone affected (dev team and users) is full of energy and that there's enough time to react to changes and to fix potential breakage without causing overtime hours. We try to avoid releases before and on major holidays and on Fridays to avoid possible weekend/holiday surprises.
>
> Note that due to 3-tier branch system, development is never blocked by the unreleased changes.

##### Releasing new version

###### Good to know:

- Nextclade Web and Nextclade CLI are always released simultaneously and with the same version number, even if there are no changes in one or another (but there better be at least some changes!).
- There are 3 Nextclade Web deployments exist: for `master`, `staging` and `release` environments. They map to 3 major git branches: `master`, `staging` and `release`, and they fetch datasets from the corresponding deployments of dataset server, which, in turn correspond branch in [nextclade_data](https://github.com/nextstrain/nextclade_data) repo.
- Similarly, there's `master`, `staging` and `release` versions of CLI, which draw data from the corresponding data server.
- See the table in [Deployment environments](./developer-guide.md#deployment-environments)
- Typically you aggregate the latest features on `master`, the occasionally push them to `staging` and finally to the `release`. So it's a pipeline. You almost never want your `release` or `staging` branch to be out-of sync with `master`, by e.g. having random things on `release`, but not on `master`.

###### Release procedure

- Checkout `master` branch.
- Make sure to fill the `CHANGELOG.md` and commit changes locally. It should start with a section named exactly `## Unreleased`, under which you list all the changes in this release.
- Make sure there are no uncommitted changes.
- Follow comments in the script `./scripts/release` on how to install dependencies for this script.
- Run `./scripts/release <bump_type>`, where `bump_type` signifies by how much you want to increment the version. It should be one of: `major`, `minor`, `patch`, `rc`, `beta`, `alpha`. Note that `rc`, `beta` and `alpha` will make a prerelease, that is - marked as "prerelease" on GitHub Releases and not overwriting "latest" tags on DockerHub.
- Verify the changes the script applied:
  - versions are bumped in all `Cargo.toml` files (one at the root adn one for each package) and the root`Cargo.lock` file.
  - version is bumped in `package.json` file.
  - a local commit created on branch `master` with a message containing the version number that you expect
- The script will provide instructions on how to push the changes. You can push to `master`, or fast-forward either `staging` or `release` to `master` and then push to `staging` or `release`. A push to any of these branches will trigger CI deployment to the corresponding environment. Most often you push the release commit to all 3 major branches.
- The script is not fool-proof and will break easily if you try. Don't!
