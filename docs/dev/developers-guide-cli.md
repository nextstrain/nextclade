# Developer's guide: Nextclade CLI and Nextalign CLI

This guide describes how to setup a development environment for building and running Nextclade CLI and Nextalign CLI executables, how to contribute to Nextclade C++ code, maintain and release the CLI tools. If you are interested in Nextclade Web Application, see: ["Developer's guide: Nextclade Web"](../../docs/dev/developers-guide-web.md).

### 🧠 Implementation notes

Nextclade CLI and Nextalign CLI are the executables are written in C++. The build system is based on CMake. Most of the algorithm code is separated in a separate static library CMake module. And the executable CMake modules link against the libraries. The default build scripts use Conan package manager to manage the dependencies. However this i not mandatory and you can obtain the dependencies any way you like, as long as they are discoverable by CMake, as in any CMake project.

There is a convenience Makefile in the root of the project that launches the build scripts. These scripts are used by project maintainers for the routine development and maintenance as well as by the continuous integration system.

The easiest way to start the development is to use the included docker container option, described in the next section. The same environment can, of course, be setup on a local machine, but that requires some manual steps, also described further.


### ✨ Develop inside a docker container

1. Get [docker](https://docs.docker.com/get-docker/)

2. Run:

    ```bash
    git clone --recursive https://github.com/nextstrain/nextclade
    cd nextclade
    make docker-dev
    ```

### ✨ Develop locally

> 💡 The instructions below and the provided dev scripts are for convenience only and by no means are mandatory. The project is based on CMake, so if you are familiar with CMake, you don't need further instructions and can build the project as usual - just run CMake CLI or CMake GUI and point them to the root of the project.


1.  Install and configure the build tools

    <p>
    <details>
    <summary>
    💡 Quick install for Ubuntu (click to expand)
    </summary>

    You can install required dependencies with 

    ```
    xargs -a apt-packages.txt sudo apt-get install

    pip3 install --user --upgrade -r requirements.txt
    ```
    
    See `apt-packages.txt` and `requirements.txt` in the root of the project for the full list.

    </details>
    </p>

    <p>
    <details>
    <summary>
    💡 Quick install for macOS  (click to expand)
    </summary>

    You need to install XCode command line tools. After that you can install remaining required dependencies using [Homebrew](https://brew.sh/) and pip (into a Python virtual environment)

    ```
    xcode-select --install

    cd nextclade
    brew bundle --file=Brewfile

    mkdir -p .cache
    python3 -m venv .cache/venv
    source .cache/venv/bin/activate
    pip3 install --upgrade -r requirements.txt

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
    git clone https://github.com/nextstrain/nextclade
    cd nextclade
    make dev
    ```

    This will:

    - configure conan profile
    - install or update conan packages
    - run cmake and generate makefiles
    - build the project and tests
    - run static analysis on source files
    - run tests
    - run CLI with parameters defined in `DEV_NEXTALIGN_CLI_OPTIONS` and `DEV_NEXTCLADE_CLI_OPTIONS` environment variable (see `.env.example` file for defaults)
    - watch source files and rebuild on changes

    > 💡 If you don't want to install Node.js and nodemon, or don't want the automatic watch & rebuild feature, you can use `make dev-nowatch` instead of `make dev` during development.  In this case you will need to rerun the script on ode changes (as opposed to it rerunning automatically).

    🎉 You are ready! Start coding! In particular, take a look at these files and directories:

    ```
    packages/nextalign_cli/src/
    packages/nextalign_cli/src/cli.cpp # Entry pint of the Nextalign CLI executable

    packages/nextalign/src/
    packages/nextalign/src/nextalign.cpp # Entry point of the library is the `nextalign()` function in this file
    
    packages/nextclade_cli/src/
    packages/nextclade_cli/src/cli.cpp # Entry pint of the Nextclade CLI executable

    packages/nextclade/src/
    packages/nextclade/src/nextclade.cpp # Entry point of the library is the `Nexatlign` class
    ```

    The CLI binaries are produced in
    
    ```
    .build/Debug/packages/nextalign_cli/nextalign_cli
    .build/Debug/packages/nextclade_cli/nextclade_cli
    ```

    The tests binaries are in
    
    ```
    .build/Debug/packages/nextalign/tests/nextalign_tests
    .build/Debug/packages/nextclade/tests/nextclade_tests
    ```

    They are ran automatically upon rebuild. But you can run them directly too, if you'd like.

    You can change the default arguments of the CLI invocation made by the `make dev` target by creating a `.env` file:

    ```bash
    cp .env.example .env
    ```

    and modifying the `DEV_NEXTALIGN_CLI_OPTIONS`  and `DEV_NEXTCLADE_CLI_OPTIONS` variables or by setting these environment variables in the shell.

    > 💡 The default input files are located in [`data/example`](https://github.com/nextstrain/nextclade/tree/master/data/example)

    > 💡 By default, the output files are produced in `tmp/` directory in the root of the project.

    > ⚠️ Do not measure performance of executables produced with `make dev` and do not use them for real workloads. Development builds, with disabled optimizations and with enabled debugging tools and instrumentation, are meant for developer's productivity, not runtime performance, and can be orders of magnitudes slower than the optimized build. Instead, for any performance assessments, use [benchmarks](#microbenchmarks), [profiling](#runtime-performance-assessment) or [production build](#production-build). In real workloads always use the [production build](#production-build).

---

### ⏩ Production build

This section describes how to build the "production" or "release" versions of Nextclade CLI and Nextalign CLI. This are the builds that are shipped to end users. Production builds have performance optimizations enabled are are much faster, but it's harder to debug them.

For build inside a docker container, run

```bash
make docker-prod
```

or, for local build, install the requirements from the ["Develop locally" section](#develop-locally) and run:

```bash
make prod
```

This will produce the optimized executables in 

```
.build/Release/packages/nextalign_cli/nextalign_cli
.build/Release/packages/nextclade_cli/nextclade_cli
```

as well as the final, stripped executables in

```
.out/bin/nextalign-Linux-x86_64
.out/bin/nextclade-Linux-x86_64
```

(replace `Linux` and `x86_64` with your OS and hardware platform)


> ⚠️ Production build (and all builds with `CMAKE_BUILD_TYPE=Release` enforce [standalone static executable](#standalone-static-build)) configuration.

---

### ✅ Assessment of correctness

#### 🧪 Unit tests

Test are run as a part of the main development script (`make dev`). The test executables are built
to:

```
.build/Debug/packages/nextalign/tests/nextalign_tests
.build/Debug/packages/clade/tests/nextclade_tests
```

and can be invoked directly as needed.

We are using [Google Test](https://github.com/google/googletest/blob/master/googletest/docs/primer.md).
See [Google Test documentation](https://github.com/google/googletest/blob/master/googletest/docs/primer.md)
and [Google Mock documentation](https://github.com/google/googletest/blob/master/googlemock/README.md) for more details.

#### 💥 End-to-end tests

##### 🚬 Smoke tests

The default dev scripts run the Nextalign CLI and Nextclade CLI under GDB (if installed) with default dataset and example data. This serves as a smoke test and indicate immediately visible failures.

The results are in `tmp/`

The environment variables control what flags are passed for CLI invocation:

 - `DEV_CLI_OPTIONS` for Nextalign
 - `DEV_NEXTCLADE_CLI_OPTIONS` for Nextclade


##### 📸 Snapshot tests

We can check the results of the smoke test against known good outputs (a snapshot). The snapshot files are in the `e2e/cli/snapshots` directory and are compressed-decompressed as needed.

In order to perform the check, run:

```
make e2e-cli-run
```

In order to update snapshots, run:

```
make e2e-cli-update-snapshots
```

This will copy the outputs of the last smoke test and they will become the new snapshot

```
make e2e-cli-update-snapshots
```

The resulting compressed archive needs to be committed to the source control.

TODO: consider storing the snapshots outside of repository.


---

### 🔬 Static analysis

We use the following static analysis tools.

#### clang-tidy

`clang-tidy`, a part of LLVM project, is a static analysis (linter) tool. During development, it is recommended to use a text editor or an IDE which has `clang-tidy` integration. Check `.clang-tidy` file in the root of the project for current configuration.


#### clang-analyzer

[Clang Static Analyzer (clang-analyzer)](https://clang-analyzer.llvm.org/), a part of LLVM project, is a source code analysis tool. Type

```
make dev-clang-analyzer
```

to build and run Nextalign CLI and Nextclade CLI with `clang-analyzer` and keep an eye on console warnings.


#### cppcheck

`cppcheck` runs as a part of the main development script (`make dev`). Keep an eye on console warnings. The file `.cppcheck` in the root of the project
contains arguments passed to `cppcheck`.

---

### 🔥 Runtime analysis

We use the following tools to perform runtime analysis of the builds.

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
USE_MASSIF=1 make prod
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


### ⏱️ Runtime performance assessment

#### 🪑 Microbenchmarks

A set of benchmarks is located
in [`packages/nextalign/benchmarks`](https://github.com/nextstrain/nextclade/tree/master/packages/nextalign/benchmarks) and in [`packages/nextclade/benchmarks`](https://github.com/nextstrain/nextclade/tree/master/packages/nextclade/benchmarks).
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

You can also run the executables directly, which are located in

```
.build/Benchmarks-Release/packages/nextalign/benchmarks/nextalign_benchmarks
.build/Benchmarks-Release/packages/nextclade/benchmarks/nextclade_benchmarks
```

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

The results are also saved to the files 

```
.reports/nextalign_benchmarks.json
.reports/nextclade_benchmarks.json
```

You can compare multiple results using the [compare.py](https://github.com/google/benchmark/tree/master/tools) tool from Google Benchmark repository. For more information refer to [Benchmark Tools](https://github.com/google/benchmark/blob/master/docs/tools.md) documentation.

#### 🐢 Profiling an instrumented build with `perf`:

```bash
make profile
```

> TODO: expand this section

---

### ⚙️ Use non-default compiler

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

### 🚢 Distribution

#### 1️⃣ Standalone static build

To simplify distribution to end users, we produce standalone, statically linked binaries, as well as a minimalistic docker image, containing only single executable.

By default static build is enable for all builds that have `CMAKE_RELEASE_TYPE=Release` (that is, production build and benchmarks). It can be selectively enabled or disabled during build time, using environment variables `NEXTALIGN_STATIC_BUILD="(0|1)"` and `NEXTCLADE_STATIC_BUILD="(0|1)"`:

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


### 👣 Tracing

There is a `debug_trace()` C++ macro with some usages spread across the codebase. They print messages, often with some numeric values, that help to see what the internal algorithms are doing during runtime. The messages are printed into the terminal (`stdout`) as well as into the browser console, when building for WebAssembly.

The tracing is disabled by default and all the usages of `debug_trace()` macro expanded to a dummy noop statement, which should be optimized away from the binary. In order to enable tracing, set environment variable `ENABLE_DEBUG_TRACE=1`, for example in the `.env` file.

In order to make traces more readable, you may also want to add the following flags to the Nextalign and Nextclade CLI invocation:

 - `--jobs=1` so that messages from different threads are not entangled together
 - `--in-order` to see messages for sequences in the same order as sequences appear in the input files

You can add new usages of `debug_trace()` where it is useful. Underneath it uses [`fmt` library](https://fmt.dev/) with Python-like syntax for the format string. User-defined types (`struct`s, `class`es, etc.) can be printed eiter field by field or using a [custom formatters](https://fmt.dev/latest/api.html#formatting-user-defined-types).

Debug tracing makes algorithms to run much slower. Do not enable it in the official production builds!


### 🚀 Creating a new release

- Increment version in `VERSION` file in the root directory

- Write release notes in a new section in the beginning of `CHANGELOG.md`. Make it friendly and comprehensible for the users. Note that this changelog will appear in the "What's new" popup dialog of next released version of Nextclade Web as well.

- Merge changes to `release-cli` branch (do not create a tag!). In most cases you want to simply release what's on `master` branch. In this case fast-forward the `release-cli` branch to `master` branch. Push the changes to the remote.

- Upon pus, CI will trigger a build and
  - run build script
  - upload binaries to Github Releases
  - build and push Docker image to Docker Hub
  - create and push a git tag

- After GitHub Release is created by CI, edit it and paste the release notes for this version into the description

> TODO: automate publication of release notes on GitHub Releases

<h3 id="troubleshooting" align="center">
😮 Troubleshooting
</h3>

#### 1. I have a newer version of a compiler, but conan and cmake keep using the old one

As a workaround you may try to add the new compiler to the `PATH` and delete and regenerate conan profile:

- Remove the old conan profile by deleting `.cache/.conan` directory
- rebuild the project and and watch for `compiler=<COMPILER_NAME>` and  `compiler.version=<VERSION>` in the output in console output of the "Install dependencies" build step, and/or set `CMAKE_VERBOSE_MAKEFILE=1` variable and check the compiler path used during "Build" step.


#### 2. I receive CMake errors about CMakeCache.txt directory being different

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

Try to remove the temporary directories: `.build`, `.cache`, `.out`, `.reports`, `tmp` and rebuild.

Note that removing conan cache in `.cache/conan` will require downloading and rebuilding of all of the dependencies on next build, which happens automatically, but is time-consuming.


#### 4. It does not work, I still need help

Feel free to create a [new Github Issue](https://github.com/nextstrain/nextclade/issues/new) or to join Nextstrain Discussion at [discussion.nextstrain.org](https://discussion.nextstrain.org/).
