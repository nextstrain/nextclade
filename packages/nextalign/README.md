<h1 id="nextalign" align="center">
Nextalign
</h1>

> <h3 align="center">
> 🧬 Viral genome reference alignment
> </h3>
> <p align="center">
> by Nextstrain team
> </p>

---

> ⚠️ IMPORTANT: Nextalign is a new project and is under heavy development. There might be serious bugs. Please report all errors and inconsistencies using [Github Issues](https://github.com/neherlab/nextalign/issues/new).

---

<p align="center">
  <a href="https://github.com/neherlab/nextalign/releases">
    <img height="50px"
      src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20Download-%2317992a.svg"
      alt="Download button"
    />
  </a>
</p>

---

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/neherlab/nextalign?label=%E2%AC%87%EF%B8%8F%20release)
![Docker Image Version (latest semver)](https://img.shields.io/docker/v/neherlab/nextalign?label=%F0%9F%90%8B%20docker)
![GitHub contributors](https://img.shields.io/github/contributors/neherlab/nextalign)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/neherlab/nextalign)
[![CircleCI](https://img.shields.io/circleci/build/github/neherlab/nextalign)](https://circleci.com/gh/neherlab/nextalign)

---

<h2 id="about" align="center">
👋 About
</h2>

Nextalign is the viral genome sequence alignment algorithm used in [Nextclade](https://github.com/nextstrain/nextclade),
ported to C++ and made to a standalone command-line tool.

Nextalign performs pairwise alignment of provided sequences against a given reference sequence using a banded local alignment with affine gap-cost. Band width and rough relative positions are determined through seed matching.

Currently Nextalign primarily focuses on SARS-CoV-2 genome, but it can be used on any virus, given a sufficiently similar reference sequence (less than a 5% divergence). Nextalign will strip insertions relative to the reference and output them in a separate CSV file.

---

<h2 id="users-guide" align="center">
👩‍🔬 User's guide
</h2>

TODO: expand this section

<h3 id="installation" align="center">
💿 Installation
</h3>

You can download Nextalign on the Releases page: https://github.com/neherlab/nextalign/releases

#### 🐧 One-liners to download for Linux

Download latest version:

```bash
curl -fsSL "https://github.com/neherlab/nextalign/releases/latest/download/nextalign-Linux-x86_64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=0.1.0 && curl -fsSL "https://github.com/neherlab/nextalign/releases/download/${NEXTALIGN_VERSION}/nextalign-Linux-x86_64" -o "nextalign" && chmod +x nextalign
```

#### 🐋 With docker

Images are available at Docker Hub: https://hub.docker.com/repository/docker/neherlab/nextalign

Pull and run the latest version with:

```
docker pull neherlab/nextalign:latest
docker run -it --rm neherlab/nextalign:latest nextalign --version
```

Pull and run a specific version with:

```
docker run -it --rm neherlab/nextalign:0.1.0 nextalign --version
```


<h3 id="usage" align="center">
🔋 Usage
</h3>

After obtaining Nextalign read help: 

```
nextalign --help
```

#### ➡️ Inputs

Nextalign accepts the following inputs:

| Required | Meaning            | Flag                        | Description                                                                                                                                                                                                                                                             |
| -------- | ------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| yes      | Sequences          | `--sequences=<path>`        | Path to a file containing sequences to align ("query" sequences). Every sequence in this file will be pairwise-aligned with the reference sequence. Accepted formats: fasta. Example: [`--sequences=data/example/sequences.fasta`](data/example/sequences.fasta)        |
| yes      | Reference sequence | `--reference=<path>`        | Path to a file containing reference sequence to align against. Accepted formats: fasta (1 sequence only), plain text. Example: [`--reference=data/example/reference.txt`](data/example/reference.txt)                                                                   |
| yes      | Gene map           | `--genemap=<path>`          | Path to a file containing gene map (genome annotation). Accepted formats: [GFF](https://www.ensembl.org/info/website/upload/gff.html), containing `gene` features and `gene_name` attributes. Example: [`--genemap=data/example/genemap.gff`](data/example/genemap.gff) |
| no       | Genes              | `--genes=<gene1,gene2,...>` | A comma-separated list of genes to use for alignment refinement. All listed genes should be present in the gene map. Affects performance and accuracy. If flag is not provided or empty, all genes present in gene map are used. Example: `--genes=E,ORF1a`             |

#### ⬅️ Outputs

Nextalign produces the following outputs:

| Required | Meaning              | Flag                         | Description                                                                                                                                                                     |
| -------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no       | Output directory     | `--output-dir=<path>`        | Nextalign will write all output files to this directory. By default, will output files to the current directory.                                                                |
| no       | Output base filename | `--output-basename=<string>` | Base filename for output files in the output directory. By default uses the filename of the sequences file (provided with `--sequences`)                                        |
| no       | Sequence output      | `--output-fasta=<path>`      | Aligned sequences will be written to this file. Format: fasta. (overrides paths given with --output-dir and --output-basename)                                                  |
| no       | Insertions output    | `--output-insertions=<path>` | A list of insertions which have been stripped from aligned sequences will be written to this file. Format: CSV. (overrides paths given with --output-dir and --output-basename) |


<h3 id="feedback" align="center">
💬 Feedback
</h3>

Do you find Nextalign useful? Tell us about your use-case and experience with it.

If you want to report an error or request a new feature, please open a [new Github Issue](https://github.com/neherlab/nextalign/issues/new).

For a general conversation, feel free to join Nextstrain Discussion at [discussion.nextstrain.org](https://discussion.nextstrain.org/).

---

<h2 id="developers-guide" align="center">
🧑‍💻 Developer's guide
</h2>

<h3 id="quick-start" align="center">
✨ Quick start: with docker
</h3>

```
UID=$(id -u) GID=$(id -g) docker-compose up --build
```

> ⚠️ The variables `UID` and `GID` need to be set to the current user ID and group ID, otherwise build files will be written as root

> 💡 Check our [`Dockerfile`](/Dockerfile) and [`docker-compose.yml`](/docker-compose.yml)


<h3 id="quick-start" align="center">
✨ Quick start: locally
</h3>

1.  Install and configure the dependencies

    - Required:

      - C++17-compliant C++ compiler

        > ⚠️ Only GCC >= 9 and Clang >= 10 are officially supported (but you can try older versions too and tell us how it goes).

      - [cmake](https://cmake.org/) >= 3.10

      - [conan](https://conan.io/) package manager

        > 💡 For Ubuntu Linux there is an installation script included in `./tools/install-conan`

      - [cppcheck](http://cppcheck.sourceforge.net/) for static analysis

        > ⚠️ A version that supports C++17 is required

    - Recommended:

      - [ccache](https://ccache.dev/) for faster rebuilds

        > 💡 On Ubuntu and other Debian derivatives it can be installed with
        >
        > ```
        > sudo apt-get install ccache
        > ```

      - [nodemon](https://www.npmjs.com/package/nodemon) for watch & rebuild feature for better developer experience

        > ⚠️ nodemon requires Node.js and npm. You can install it globally with:
        >
        > ```bash
        > npm install --global nodemon
        > ```

        > 💡 If you don't want to install Node.js and nodemon, or don't want the automatic watch & rebuild feature, you can use `make dev-nowatch` instead of `make dev` during development.

      - [clang-tidy](https://clang.llvm.org/extra/clang-tidy/) for static analysis. It is recommended to use an text editor or an IDE with clang-tidy support

2.  Clone, run and develop

    ```bash
    git clone --recursive https://github.com/neherlab/nextalign
    cd nextalign
    make dev
    ```

    > ⚠️ Note the `--recursive` flag for `git` command - this repository contains git submodules

    This will:

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

    > 💡 The default input files are located in [`data/example`](https://github.com/neherlab/nextalign/tree/master/data/example)

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
in [`packages/nextalign/benchmarks`](https://github.com/neherlab/nextalign/tree/master/packages/nextalign/benchmarks).
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

#### 🔚 End-to-end benchmark

TODO: under construction

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

TODO: under construction

---

<h3 id="static-analysis" align="center">
🔬 Static analysis
</h3>

We use the following static analysis tools and we aim to produce 0 warnings.

#### clang-tidy

`clang-tidy`, a part of LLVM project, is a static analysis (linter) tool. During development, it is recommended to use a text editor or an IDE wich has `clang-tidy` integration.

Check `.clang-tidy` file in the root of the project for current configuration.

TODO: run `clang-tidy` as a part of the dev script

#### clang-analyzer

TODO: under construction

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

TODO: under construction

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

> 💡 On Ubuntu you can build it along with other binutils using the provided script in `scripts/deps/build_binutils.sh`. The results of the build will be in `3rdparty/binutils`.

> 💡 The projects' build system is setup to automatically pickup the `ld` linker from `3rdparty/binutils/bin/` if it exists.


#### 🚅 Profile-guided optimization (PGO)

TODO: add profile-guided optimization

#### Creating a new release

 - Increment `VERSION` of `project()` command in cmake files (TODO: automate this):
    - packages/nextalign/CMakeLists.txt
    - packages/nextalign_cli/CMakeLists.txt

   CI will refuse to run if there's a tag exist with the current version already.

 - Merge changes to `release`  branch (do not create a tag!)

 - CI will trigger a build and
    - run build script
    - upload binaries to Github Releases
    - create and push a git tag
    - build and push Docker image to Docker Hub


<h3 id="troubleshooting" align="center">
😮 Troubleshooting
</h3>

#### 1. I have a newer version of a compiler, but conan and cmake keep using the old one

The `./tools/install-conan` script makes conan to remember compiler that was in the `PATH` when the script has been
executed.

As a workaround you may try to add the new compiler to the `PATH` and delete and regenerate conan profile:

- Remove the old profile by deleting `~/.conan` directory
- run `./tools/install-conan`
- rebuild the project and and watch for `<VERSION>`:

  ```
  compiler=gcc
  ...
  compiler.version=<VERSION>
  ```

in console output of the "Install dependencies" build step, and/or set `CMAKE_VERBOSE_MAKEFILE=1` variable and check the
compiler path used during "Build" step.

TODO: use conan profile local to the project, to simplify usage of different compilers.

#### 2. I have other strange things happening during build

Try to remove the build directory (`.build`) and rebuild.

<h3 id="team" align="center">
🧑‍🤝‍🧑 Team
</h3>

TODO: under construction

<h3 id="license" align="center">
⚖️ License
</h3>

<a target="_blank" rel="noopener noreferrer" href="LICENSE" alt="License file">MIT License</a>
