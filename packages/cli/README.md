# Nextclade: command-line tool

Clade assignment, mutation calling, and sequence quality checks

---

This is the command-line version of Nextclade.

<p>
  <span>You can also try our web application at: </span>
  <a target="_blank" rel="noopener noreferrer" href="https://clades.nextstrain.org" alt="Link to our website">
    clades.nextstrain.org
  </a>
</p>



## Getting started

### Locally

In order to run locally, you need Node.js and npm installed.
It is recommended to use [`nvm`](https://github.com/nvm-sh/nvm) or [`nvm-windows`](https://github.com/coreybutler/nvm-windows) to install and manage Node.js versions. Nextclade CLI supports Node.js versions >= 12, version >= 14.15.0 LTS is recommended.

Having Node.js and npm available, install the latest release of the [`nextclade` npm package](https://www.npmjs.com/package/@nextstrain/nextclade) globally:

```bash
npm install --global @neherlab/nextclade
```

Explore available options:

```bash
nextclade --help
```

Run, given a .fasta file with sequences

```bash
nextclade --input-fasta 'sequences.fasta' --output-json 'results.json'
```

or, shorter:

```bash
nextclade -i 'sequences.fasta' -o 'results.json'
```

Generated file `results.json` will contain the results in JSON format.
Similarly, results can be generated in .csv or .tsv format, or in multiple formats (by passing multiple `--output-<format>=` flags)
All files have the same format as exports from the [Nextclade web application](https://clades.nextstrain.org).

Nextclade can accept a custom Auspice JSON v2 reference tree through `--input-tree` and it's root sequence through `--input-root-seq` flags. It is user's responsibility to ensure that the root sequence corresponds to the root node of the tree - Nextclade has no possibility to enforce that requirement. The results will be incorrect if it isn't.

With `--output-tree` flag you can output a new Nextstrain tree, with the analyzed sequences placed on it (in the same Auspice JSON v2 format). The tree produced is the same which you would see in Nextclade web application on tree page. This file can be used for further processing and visualization (for example with [auspice.us](https://auspice.us)). Note that Nextclade implements a fast but also very simplified tree placement algorithm. Its purpose is to give a rough idea of where the sequences may end up on the tree, and it is not a substitute for a full Nextstrain build.

Nextclade is currently in active development stage. If you encounter problems with the latest version, or if you need to use the same version to produce consistent, comparable experiments, you can install a specific version as follows:

```
npm install --global @nextstrain/nextclade@0.8.1
```

See the list of all versions released on NPM: [www.npmjs.com/package/@nextstrain/nextclade?activeTab=versions](https://www.npmjs.com/package/@nextstrain/nextclade?activeTab=versions). Note that only versions from the `latest` channel are officially supported. Version marked `alpha` and `beta` versions are for development and internal testing. We release them publicly, but discourage using them for any serious purposes. You can find out which version you are currently using by running `nextclade --version`.


### With docker

Docker images with Nextclade CLI are hosted in docker hub repository [`nextstrain/nextclade`](https://hub.docker.com/r/nextstrain/nextclade). They contain everything needed to run Nextclade, including the currently recommended version of Node.js. The only requirement is to have [Docker installed](https://docs.docker.com/get-docker/).

You can pull the latest image and run the container as follows

```bash
docker run -it --rm -u 1000 --volume="${ABSOLUTE_PATH_TO_SEQUENCES}:/seq" neherlab/nextclade nextclade --input-fasta '/seq/sequences.fasta' --output-json '/seq/results.json'
```

Explanation:

 - `-it` - runs inside an interactive instance of tty. Optional.
 - `--rm` - deletes the container after usage. Optional.
 - `-u 1000`. Runs container as a user with UID `1000`. Substitute `1000` with your local user's UID. UID of the current user can be found by running `id -u`. On single-user machines it is typically `1000` on Linux and `501` on Mac. If this parameter is not present, output files will be written on behalf of the root user, making them harder to operate on. Optional, but recommended.
 - `--volume="${ABSOLUTE_PATH_TO_SEQUENCES}:/seq"`. Substitute `${ABSOLUTE_PATH_TO_SEQUENCES}` with your *absolute* path to a directory containing input fasta sequences on your computer. This is necessary in order for docker container to have access to this directory. In this example, it will be available as `/seq` inside the container.
 - `neherlab/nextclade` name of the image to pull. In Unix-like environments you can use the variable `${PWD}` to get the absolute path to the current directory, for example: `--volume="${PWD}/data:/seq"`.
 - `nextclade --input-fasta '/seq/sequences.fasta' --output-json '/seq/results.json` the usual invocation of the tool. Note that in this example we read and write from `/seq` directory inside the container, which we mounted using Docker's `--volume=` parameter.


The default (`latest`) tag uses Node.js image based on Debian stretch. It is also possible to use smaller Alpine Linux-based images by appending `:alpine` tag after the repo name:  

```
docker run ... nextstrain/nextclade:alpine ...
```

See the list of all tags on Docker Hub: [hub.docker.com/r/nextstrain/nextclade/tags](https://hub.docker.com/r/nextstrain/nextclade/tags)


### Tips and tricks

#### Memory consumption

In the current implementation, Nextclade may consume large amounts of memory. By default, Nextclade currently detects the number of logical threads available on the machine and runs this number of sequence analyses in parallel - one input sequence per thread. It might happen that you have a machine with many cores/threads but limited amount of memory. In this case, many  Nextclade threads will run concurrently, and it might run out of heap space and become very slow and unstable.

Additionally, while processing sequences, Nextclade accumulates information for the output tree construction. When there are many sequences, it may also lead to the excessive memory consumption, even in low-parallelism scenarios.


It is recommended to monitor the memory consumption, especially in automated workflows. To tune the memory consumption you could also:
 
  - limit the parallelism of Nextclade with `--jobs=n` flag

  - run completely sequentially (1 thread) with `--jobs=1`

  - process fewer sequences, by filtering/subsampling the data before passing to Nextclade
  
  - process fewer sequences at a time, by batching the input data before passing it into multiple Nextclade runs, and then merging the results for every run


We are planning:

 - algorithmic improvements which should reduce the memory footprint of Nextclade
 
 - streaming and batching of inputs
 
Contributions are welcome!


## Developer's guide

### Build: production version

This will build a production version of the command-line tool:

```bash
git clone https://github.com/nextstrain/nextclade
# Optionally checkout a branch or a tag: git checkout -b 0.8.1
cd nextclade/packages/web
cp .env.example .env
yarn cli:prod:build
```

The build results - the main executable script, and a set of webworker modules, along with their source maps - will appear in `nextclade/packages/cli/dist/`.

If Node.js >= 12 is available locally, the freshly built Nextclade can be ran as

```bash
node nextclade.js
```

or simply 

```bash
nextclade.js
```

### Build: standalone executables

A standalone executable (without dependency on Node.js) can be created with

```bash
cd nextclade/packages/web
yarn cli:prod:build:exe
```

The native executables for various platforms will appear in `nextclade/packages/cli/dist/`.
This uses [`pkg`](https://github.com/vercel/pkg) tool to wrap the script together with Node.js runtime into one standalone file. Currently, these are neither officially released nor supported.

### Publish a new version to NPM and Docker Hub

Increment the version in both, `nextclade/packages/web/package.json` and `nextclade/packages/cli/package.json`:

```json
{
  "version": "x.y.z"
}
```

The version formats accepted:
 
 - `x.y.z` - semantic version for stable releases (will be published to `latest` channel on NPM and with no tag prefix on Docker Hub)

 - `x.y.z-beta.n` - semantic version and a mandatory suffix for beta releases (will be published to `beta` channel on NPM and with `beta` tag prefix on Docker Hub)

 - `x.y.z-alpha.n` - semantic version and a mandatory suffix for alpha releases (will be published to `alpha` channel on NPM and with `alpha` tag prefix on Docker Hub) 


rebuild:

```bash
cd packages/web
yarn cli:prod:build
```

publish:

```bash
cd packages/cli
./release.sh
```

This will:
 - publish a new version on NPM to the appropriate channel
 - build and push Docker images to Docker Hub

### Run in development mode

For development purposes run

```
git clone https://github.com/nextstrain/nextclade
cd nextclade/packages/web
cp .env.example .env
yarn cli:dev

```

This will start webpack in watch mode and all changes will trigger partial rebuilds, which is convenient for continuous development. The build results will appear in `nextclade/packages/cli/dist/` and can be run similarly to the production version (see above).


## License

<a target="_blank" rel="noopener noreferrer" href="../LICENSE" alt="License file">MIT License</a>
