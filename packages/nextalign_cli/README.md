<h1 id="nextclade" align="center">
Nextalign
</h1>

<h4 id="nextclade" align="center">
Viral genome alignment
</h4>

<p align="center">
by Nextstrain team
</p>

---

> ⚠️ IMPORTANT:
> 
> Nextalign is a new project and is under development.
> 
> Please report bugs and request features using GitHub Issues:
> https://github.com/nextstrain/nextclade/issues/new
> 
> For questions and general discussion join Nextstrain discussion forum:
> https://discussion.nextstrain.org

---

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/releases">
    <img height="30px"
      src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20Download-%231825aa.svg"
      alt="Download button"
    />
  </a>

  <a href="https://hub.docker.com/r/nextstrain/nextalign">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%90%8B%20%20%20Docker-%231188cc.svg"
      alt="Docker button"
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

---

![Docker Image Version (latest semver)](https://img.shields.io/docker/v/nextstrain/nextalign?label=%F0%9F%90%8B%20docker)

---

<h2 id="about" align="center">
👋 About
</h2>

Nextalign is a viral genome sequence alignment algorithm used in [Nextclade](https://github.com/nextstrain/nextclade), ported to C++ and made into the standalone command-line tool.

Nextalign performs pairwise alignment of provided sequences against a given reference sequence using banded local alignment algorithm with affine gap-cost. Band width and rough relative positions are determined through seed matching.

Nextalign will strip insertions relative to the reference and output them in a separate CSV file.

Optionally, when provided with a gene map and a list of genes, Nextalign can perform translation of these genes.

Currently Nextalign primarily focuses on SARS-CoV-2 genome, but it can be used on any virus, given a sufficiently similar reference sequence (less than a 5% divergence).

---

<h2 id="users-guide" align="center">
👩‍🔬 User's guide
</h2>

<h3 id="installation" align="center">
💿 Installation
</h3>

<h3 id="download-manually" align="center">
🤏 Download manually
</h3>


You can download Nextalign executables on Github Releases page:

https://github.com/nextstrain/nextclade/releases

> ⚠️ Note that macOS executables are not currently signed with a developer certificate. Recent versions of macOS might refuse to run it. Before invoking Nextalign on command line, follow these steps to add Nextalign to the exclude list:
> <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac">
macOS User Guide: Open a Mac app from an unidentified developer</a>, or, if this does not work, check <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/en-us/HT202491">
Security settings</a>.

<h3 id="download-from-command-line" align="center">
🖥️ Download from command line
</h3>

The following commands can be used to download nextalign from command line, from shell scripts and inside dockerfiles (click to expand):

<p>
<details>
<summary>
🐧 Linux x86_64
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-Linux-x86_64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=0.1.4 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextalign-${NEXTALIGN_VERSION}/nextalign-Linux-x86_64" -o "nextalign" && chmod +x nextalign
```
</details>
</p>

<p>
<details>
<summary>
🍏 macOS Intel
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-x86_64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=0.1.4 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextalign-${NEXTALIGN_VERSION}/nextalign-MacOS-x86_64" -o "nextalign" && chmod +x nextalign
```
</details>
</p>

<p>
<details>
<summary>
🍎 macOS Apple Silicon
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-arm64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=0.1.4 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextalign-${NEXTALIGN_VERSION}/nextalign-MacOS-arm64" -o "nextalign" && chmod +x nextalign
```
</details>
</p>


Native Windows executables are not yet available. Windows users can try one of the following:

 - Downloading and running Linux executable from [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
 - Running docker container (see below)
 - Renting a Linux machine, for example at any cloud compute provider


<h3 id="with-docker" align="center">
🐋 With docker
</h3>


Container images are available at Docker Hub: https://hub.docker.com/repository/docker/nextstrain/nextalign

Pull and run the latest version with:

```
docker pull nextstrain/nextalign:latest
docker run -it --rm nextstrain/nextalign:latest nextalign --help
```

Pull and run a specific version with:

```
docker run -it --rm nextstrain/nextalign:0.1.4 nextalign --help
```

Don't forget to mount necessary volumes to be able to supply the data inside the container and to access the results.


<h3 id="usage" align="center">
🔋 Usage
</h3>

Refer to help prompt for usage of Nextalign:

```
nextalign --help
```

Quick Example:

 1. Download the example SARS-CoV-2 data files from:
    https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2
    (You can also try other viruses in the `data/` directory)

 2. Run:
    nextalign --sequences=sequences.fasta --reference=reference.fasta --genemap=genemap.gff --genes=E,M,N,ORF10,ORF14,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S --output-dir=output/ --output-basename=nextalign

    Add `--verbose` flag to show more information in the console. Add `--write-ref` flag to also write gap-stripped reference sequence and peptides into outputs.

 3. Find the output files in the `output/` directory


<h3 id="feedback" align="center">
💬 Feedback
</h3>

Do you find Nextalign useful? Tell us about your use-case and experience with it.

If you want to report an error or request a new feature, please open a [new Github Issue](https://github.com/nextstrain/nextclade/issues/new).

For a general conversation, feel free to join Nextstrain Discussion at [discussion.nextstrain.org](https://discussion.nextstrain.org/).

---

<h2 id="developers-guide" align="center">
🧑‍💻 Developer's guide
</h2>

<h3 id="quick-start" align="center">
✨ Develop inside a docker container
</h3>

1. Get [docker](https://docs.docker.com/get-docker/)

2. Run:

    ```bash
    git clone --recursive https://github.com/nextstrain/nextclade
    cd nextclade
    make docker-dev
    ```

<h3 id="quick-start" align="center">
✨ Develop locally
</h3>

> 💡 The instructions below and the provided dev scripts are for convenience only and by no means are mandatory. The project is based on CMake, so if you are familiar with CMake, you don't need further instructions and can build the project as usual - just run CMake CLI or CMake GUI and point them to the root of the project.


1.  Install and configure the dependencies

    <p>
    <details>
    <summary>
    💡 Quick install for Ubuntu
    </summary>

    You can install required dependencies from 

    ```
    sudo apt-get install 
      bash \
      ccache \
      cmake \
      coreutils \
      cppcheck \
      file \
      gdb \
      g++ \
      gcc \
      make \
      python3 \
      python3-pip \
      python3-setuptools \
      python3-wheel \

    pip3 install --user --upgrade conan cppcheck
    ```
    </details>
    </p>

    <p>
    <details>
    <summary>
    💡 Quick install for macOS
    </summary>

    You need to install XCode command line tools. After that you can install remaining required dependencies using [Homebrew](https://brew.sh/) and pip

    ```
    xcode-select --install

    brew install ccache cmake conan coreutils cppcheck python

    pip3 install --user --upgrade conan cppcheck
    ```
    </details>
    </p>


    - Required:

      - C++17-compliant C++ compiler

        > ⚠️ Only GCC >= 9 and Clang >= 10 are officially supported (but you can try older versions too and tell us how it goes)

      - [cmake](https://cmake.org/) >= 3.10

      - [conan](https://conan.io/) package manager

      - [cppcheck](http://cppcheck.sourceforge.net/) for static analysis

        > ⚠️ A version that supports C++17 is required

       - coreutils

    - Recommended:

      - [ccache](https://ccache.dev/) for faster rebuilds

      - [gdb](https://www.gnu.org/software/gdb/) to automatically run the executables under debugger and show stack traces and other useful information in case of crashes

      - [nodemon](https://www.npmjs.com/package/nodemon) for watch & rebuild feature, for better developer experience and productivity

        > ⚠️ nodemon requires Node.js and npm

        > 💡 If you don't want to install Node.js and nodemon, or don't want the automatic watch & rebuild feature, you can use `make dev-nowatch` instead of `make dev` during development (see below).

      - [clang-tidy](https://clang.llvm.org/extra/clang-tidy/) for static analysis. It is recommended to use an text editor or an IDE with clang-tidy support

2.  Clone, run and develop

    ```bash
    git clone --recursive https://github.com/nextstrain/nextclade
    cd nextclade
    make dev
    ```

    > ⚠️ Note the `--recursive` flag for `git` command - this repository contains git submodules

    This will:

    - configure conan profile
    - install or update conan packages
    - run cmake and generate makefiles
    - build the project and tests
    - run static analysis on source files
    - run tests
    - run CLI with parameters defined in `DEV_CLI_OPTIONS` environment variable
    - watch source files and rebuild on changes

    > 💡 If you don't want to install Node.js and nodemon, or don't want the automatic watch & rebuild feature, you can use `make dev-nowatch` instead of `make dev` during development.

    🎉 You are ready! Start coding! In particular, take a look at these files and directories:

    ```
    packages/nextalign_cli/src/
    packages/nextalign_cli/src/cli.cpp # Entry pint of the CLI executable

    packages/nextalign/src/
    packages/nextalign/src/nextalign.cpp # Entry point of the library is the `nextalign()` function in this file
    ```

    The CLI binary is produced in `.build/Debug/packages/nextalign_cli/nextalign_cli`
    The tests binary is in `.build/Debug/packages/nextalign/tests/nextalign_tests`.
    You can run them directly too, if you'd like.

    You can change the default arguments of the CLI invocation make by the `make dev` target by creating a `.env` file:

    ```bash
    cp .env.example .env
    ```

    and modifying the `DEV_CLI_OPTIONS` variable.

    > 💡 The default input files are located in [`data/example`](https://github.com/nextstrain/nextclade/tree/master/data/example)

    > 💡 By default, the output files are produced in `tmp/` directory in the root of the project.

    > ⚠️ Do not measure performance of executables produced with `make dev` and do not use them for real workloads. Development builds, with disabled optimizations and with enabled debugging tools and instrumentation, are meant for developer's productivity, not runtime performance, and can be orders of magnitudes slower than the optimized build. Instead, for any performance assessments, use [benchmarks](#microbenchmarks), [profiling](#runtime-performance-assessment) or [production build](#production-build). In real workloads always use the [production build](#production-build).

---

<h3 id="production-build" align="center">
⏩ Production build
</h3>

Having the requirements from the ["Quick start" section](#quick-start) installed, run

```bash
make prod
```

This will produce the optimized executable in `.build/Release/packages/nextalign_cli/nextalign_cli`, which you can run directly. This is what we (will) redistribute to the end users.

> ⚠️ Production build (and all builds with `CMAKE_BUILD_TYPE=Release` enforce [standalone static executable](#standalone-static-build)) configuration.

---

<h3 id="runtime-performance-assessment" align="center">
⏱️ Runtime performance assessment
</h3>

#### 🪑 Microbenchmarks

A set of benchmarks is located
in [`packages/nextalign/benchmarks`](https://github.com/nextstrain/nextclade/tree/master/packages/nextalign/benchmarks).
We are using [Google Benchmark](https://github.com/google/benchmark) framework. Read the
important [Runtime and Reporting Considerations](https://github.com/google/benchmark#runtime-and-reporting-considerations)
.

> ⚠️ For the most accurate results, you should [disable CPU frequence scaling](https://github.com/google/benchmark#disabling-cpu-frequency-scaling) for the time of your benchmarking session. (More info: [[kernel](https://www.kernel.org/doc/html/v4.15/admin-guide/pm/cpufreq.html)]
> , [[arch](https://wiki.archlinux.org/index.php/CPU_frequency_scaling)]
> , [[debian](https://wiki.debian.org/CpuFrequencyScaling)])

> 💡 As a simple solution, on most modern hardware and Linux distros, before running benchmarks you could temporarily switch to `performance` governor, with
>
> ```bash
> sudo cpupower frequency-set --governor performance
> ```
>
> and then back to `powersave` governor with
>
> ```bash
> sudo cpupower frequency-set --governor powersave
> ```

Run benchmarks with

```bash
make benchmarks
```

This will install dependencies, build the library and benchmarks in "Release" mode and will run the benchmarks.
Benchmarks will rerun on code changes.

Or run the `scripts/benchmarks.sh` directly (no hot reloading).

You can also run the executable directly, it is localed
in `.build/Benchmarks-Release/packages/nextalign/benchmarks/nextalign_benchmarks`

> 💡 For better debugging experience, you can also build in "Debug" mode and run under GDB with:
>
> ```bash
> CMAKE_BUILD_TYPE=Debug USE_GDB=1 make benchmarks
> ```

You can pass parameters to the benchmark executable with either of:

```bash
BENCHMARK_OPTIONS='--help' make benchmarks
scripts/benchmarks.sh --help
```

For example, you can filter the benchmarks by name: to run only the benchmarks containing the word "Average":

```bash
BENCHMARK_OPTIONS='--benchmark_filter=.*Average' make benchmarks
```

The results are also saved to the file `nextalign_benchmarks.json`. You can compare multiple results using
the [compare.py](https://github.com/google/benchmark/tree/master/tools) tool in the Google Benchmark's repository. For
more information refer to [Benchmark Tools](https://github.com/google/benchmark/blob/master/docs/tools.md)
documentation.

#### 🐢 Profiling instrumented build with `perf`:

```bash
make profile
```

---

<h3 id="assessment-of-correctness" align="center">
✅ Assessment of correctness
</h3>

#### 🧪 Unit tests

Test are run as a part of the main development script (`make dev`). The test executable is built
to: `.build/Debug/packages/nextalign/tests/nextalign_tests`, and can be invoked directly as needed.

We are using [Google Test](https://github.com/google/googletest/blob/master/googletest/docs/primer.md).
See [Google Test documentation](https://github.com/google/googletest/blob/master/googletest/docs/primer.md)
and [Google Mock documentation](https://github.com/google/googletest/blob/master/googlemock/README.md) for more details.

#### 💥 End-to-end tests

> TODO: setup e2e tests based on CLI

---

<h3 id="static-analysis" align="center">
🔬 Static analysis
</h3>

We use the following static analysis tools and we aim to produce 0 warnings.

#### clang-tidy

`clang-tidy`, a part of LLVM project, is a static analysis (linter) tool. During development, it is recommended to use a text editor or an IDE wich has `clang-tidy` integration.

Check `.clang-tidy` file in the root of the project for current configuration.

> TODO: run `clang-tidy` as a part of the dev script

#### clang-analyzer

> TODO: setup clang-analyzer

#### cppcheck

`cppcheck` runs as a part of the main development script (`make dev`). The file `.cppcheck` in the root of the project
contains arguments passed to `cppcheck`.

---

<h3 id="runtime-analysis" align="center">
🔥 Runtime analysis
</h3>

We use the following tools to perform runtime analysis of the builds. All of these tools should run cleanly, with no crashes, and with empty reports.

#### 🛀 Sanitizers

Sanitizers are the binary instrumentation tools, which help to find various runtime issues related to memory management,
threading and programming mistakes which lead to [undefined behavior](https://en.cppreference.com/w/c/language/behavior)
.

The project is set up to build with sanitizers, if one of the following `CMAKE_BUILD_TYPE`s is set:

| CMAKE_BUILD_TYPE | Effect                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ASAN             | [Address](https://clang.llvm.org/docs/AddressSanitizer.html) + [Leak](https://clang.llvm.org/docs/LeakSanitizer.html) sanitizers |
| MSAN             | [Memory sanitizer](https://clang.llvm.org/docs/MemorySanitizer.html)                                                             |
| TSAN             | [Thread sanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)                                                             |
| UBSAN            | [Undefined behavior sanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)                                      |

> 💡 For example, if the program is crashing with a segfault, you could to try to run address sanitizer on it:
>
> ```
> CMAKE_BUILD_TYPE=ASAN make dev
> ```

> 💡 Both GCC and Clang support these sanitizers to various degrees, but there might be kinks here and there. So you might need to try with both compilers (see: [Use non-default compiler](#use-non-default-compiler)).

#### Valgrind

##### Valgrind memcheck

Set environment variable `USE_VALGRIND=1` in order to run the executable with `valgrind` memcheck:

```bash
USE_VALGRIND=1 make dev

```


##### Valgrind massif

Set environment variable `USE_MASSIF=1` in order to run the executable with `valgrind` massif heap profiler:

```bash
USE_VALGRIND=1 make prod

```

Note the process id in the header:

```
==263799== Massif, a heap profiler
```

It's `263799` in this example.

After valgrind is done, in order to visualize results, run `ms_print`, with the output filename, containing the process ID. For the example from above it will be:

```
ms_print massif.out.263799
```

---

<h3 id="use-non-default-compiler" align="center">
⚙️ Use non-default compiler
</h3>

#### Building with Clang

You can tell build scripts to forcefully use Clang instead of the default compiler (e.g. GCC on Linux) by setting the
environment variable `USE_CLANG=1`. For example:

```
USE_CLANG=1 make dev
USE_CLANG=1 make prod
CMAKE_BUILD_TYPE=ASAN USE_CLANG=1 make dev

```

In this case, binaries will be produced in directories postfixed with `-Clang`, e.g. `.build/Debug-Clang`.

> 💡 On Ubuntu you can build LLVM project (including Clang) with a script provided in `scripts/deps/build_llvm.sh`. It depends on binutils which should be built with `scripts/deps/build_binutils.sh` prior to that. There is also a script to build GCC: `scripts/deps/build_gcc.sh`. Refer to comments inside these scripts for the list of dependencies required. As a result of these scripts, the ready-to-use compilers will be in `3rdparty/gcc` and `3rdparty/llvm`,

> 💡 The projects' build system is setup to automatically pickup the `gcc` and `g++` executables from `3rdparty/gcc/bin/`, and `clang` and `clang++` executables from `3rdparty/llvm/bin/` if any of those exist.

---

<h3 id="distribution" align="center">
🚀 Distribution
</h3>

#### 1️⃣ Standalone static build

To simplify distribution to end users, we produce standalone, statically linked binaries, as well as a minimalistic docker image, containing only single executable.

By default static build is enable for all builds that have `CMAKE_RELEASE_TYPE=Release` (that is, production build and benchmarks). It can be selectively enabled or disabled during build time, using environment variable `NEXTALIGN_STATIC_BUILD="(0|1)"`:

```bash
NEXTALIGN_STATIC_BUILD=1 make dev # produces statically-linked dev build
NEXTALIGN_STATIC_BUILD=0 make prod # produces dynamically-liked prod build

```

See PR #7 for caveats and other considerations.

#### 🚅 Link-time optimization (LTO)

Runtime performance is important for this project and for production builds we use a gold-plugin-enabled linker
executable.

> TODO: this is currently not true. We need to setup LTO on CI.

> 💡 On Ubuntu you can build it along with other binutils using the provided script in `scripts/deps/build_binutils.sh`. The results of the build will be in `3rdparty/binutils`.

> 💡 The projects' build system is setup to automatically pickup the `ld` linker from `3rdparty/binutils/bin/` if it exists.

#### 🚅 Profile-guided optimization (PGO)

> TODO: setup profile-guided optimization based on CLI executable or e2e tests

#### Creating a new release

- Increment version in `VERSION` files:

  > TODO: automate incrementing the versions

  - packages/nextalign/VERSION
  - packages/nextalign_cli/VERSION

- Merge changes to `release` branch (do not create a tag!)

- CI will trigger a build and
  - run build script
  - upload binaries to Github Releases
  - build and push Docker image to Docker Hub
  - create and push a git tag

<h3 id="troubleshooting" align="center">
😮 Troubleshooting
</h3>

#### 1. I have a newer version of a compiler, but conan and cmake keep using the old one

As a workaround you may try to add the new compiler to the `PATH` and delete and regenerate conan profile:

- Remove the old conan profile by deleting `.cache/.conan` directory
- rebuild the project and and watch for `compiler=<COMPILER_NAME>` and  `compiler.version=<VERSION>` in the output in console output of the "Install dependencies" build step, and/or set `CMAKE_VERBOSE_MAKEFILE=1` variable and check the compiler path used during "Build" step.


#### 2. I receive CMake errors about CMakeCache.txt directory

The error might look similar to this (click to open):

<p>
<details>
<summary>
Possibe CMake error
</summary>

```
CMake Error: The current CMakeCache.txt directory .build/Debug/CMakeCache.txt is different than the directory /src/.build/Debug where CMakeCache.txt was created. This may result in binaries being created in the wrong place. If you are not sure, reedit the CMakeCache.txt

CMake Error: The source "CMakeLists.txt" does not match the source "/src/CMakeLists.txt" used to generate cache.  Re-run cmake with a different source directory.
```

</details>
</p>

You are probably trying to run local build after running docker-based build.

Docker build uses the same host directory as local build, but the paths inside container are different. That's why CMake gets confused.

Simply delete the current build directory, e.g. `.build/Debug` or the entire `.build`, and rerun, so that CMake can regenerate its cache with the correct paths.


#### 3. I have other strange things happening during build

Try to remove the temporary directories: `.build`, `.cache`, `.out` and rebuild.

Note that removing conan cache in `.cache/.conan` will require redownloading and rebuilding of all of the dependencies on next build, which might be time consuming.


<h3 id="license" align="center">
⚖️ License
</h3>

<a target="_blank" rel="noopener noreferrer" href="../LICENSE" alt="License file">MIT License</a>
