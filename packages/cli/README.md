# Nextclade

Clade assignment, mutation calling, and sequence quality checks

---

<p>
  <span>Try our web application at: </span>
  <a target="_blank" rel="noopener noreferrer" href="https://clades.nextstrain.org" alt="Link to our website">
    clades.nextstrain.org
  </a>
</p>



## Getting started

### Locally

In order to run locally, you need Node.js and npm installed.
It is recommended to use [`nvm`](https://github.com/nvm-sh/nvm) or [`nvm-windows`](https://github.com/coreybutler/nvm-windows) to install and manage Node.js versions. Nextclade CLI supports Node.js versions >= 10.

Having Node.js and npm available, install the latest release of the [`nextclade` npm package](https://www.npmjs.com/package/@neherlab/nextclade) globally:

```bash
npm install --global @neherlab/nextclade
```

you may also try the cutting-edge beta version:

```bash
npm install --global @neherlab/nextclade@beta
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

Additionally, Nextclade can output a new Nextstrain tree (in the same Auspice JSON v2 format), with the user-provided sequences placed on it, with `--output-tree`. Note that this simplified tree placement is to give a rough idea of where the sequences may end up, and this does not substitute the full Nextstrain build.

### With docker

Docker images with Nextclade CLI are hosted in docker hub repository [`neherlab/nextclade`](https://hub.docker.com/r/neherlab/nextclade)

You can pull the latest image and run the container as follows

```bash
docker run -it --rm -u 1000 --volume="${ABSOLUTE_PATH_TO_SEQUENCES}:/seq" neherlab/nextclade nextclade.js --input-fasta '/seq/sequences.fasta' --output-json '/seq/results.json'
```

Explanation:

 - `-it` - runs inside an interactive instance of tty. Optional.
 - `--rm` - deletes the container after usage. Optional.
 - `-u 1000`. Runs container as a user with UID `1000`. Substitute `1000` with your local user's UID. UID of the current user can be found by running `id -u`. On single-user machines it is typically `1000` on Linux and `501` on Mac. If this parameter is not present, output files will be written on behalf of the root user, making them harder to operate on. Optional, but recommended.
 - `--volume="${ABSOLUTE_PATH_TO_SEQUENCES}:/seq"`. Substitute `${ABSOLUTE_PATH_TO_SEQUENCES}` with your *absolute* path to a directory containing input fasta sequences on your computer. This is necessary in order for docker container to have access to this directory. In this example, it will be available as `/seq` inside the container.
 - `neherlab/nextclade` name of the image to pull.
 - `nextclade.js --input-fasta '/seq/sequences.fasta' --output-json '/seq/results.json` the usual invocation of the tool. Note that in this example we read and write from `/seq` directory inside the container, which we previously mounted our local directory with sequences to.


The default (`latest`) tag uses Node.js image based on Debian stretch. It is also possible to use smaller Alpine Linux-based images by appending `:alpine` tag after the repo name:  

```
docker run ... neherlab/nextclade:alpine ...
```

## Build

This will build a production version of the command-line tool:

```bash
git clone https://github.com/nextstrain/nextclade
cd nextclade/packages/web
cp .env.example .env
yarn cli:prod:build
```

The bundled npm script will appear as `nextclade/packages/cli/dist/nextclade.js`.
The script is standalone, does not require any local dependencies and can be moved.

If Node.js >= 10 is available locally, the tool can be ran as

```bash
node nextclade.js
```

or simply 

```bash
nextclade.js
```

A standalone executable (without dependency on Node.js) can be created with

```bash
cd nextclade/packages/web
yarn cli:prod:build:exe
```

The native executables for various platforms will appear in `nextclade/packages/cli/dist/`.
This uses [`pkg`](https://github.com/vercel/pkg) tool to wrap the script together with Node.js runtime into one standalone file. 


## Publish

This describes how to publish a new version of the package on NPM.
After build step above, increment the version in `nextclade/packages/cli/package.json`:

```json
{
  "version": "x.y.z"
}
```

and run:

```bash
cd nextclade/packages/cli
npm publish
```

If you need to re-publish the same version (which npm disallows), append an index of the re-release after a dash,
 using the following format: `${x.y.z}-{k}`, for example: 

```json
{
  "version": "0.4.0-1"
}
```

In order to publish a beta version, name the version in `nextclade/packages/cli/package.json` using
`${x.y.z}-beta.${k}`, format where `${x.y.z}` is the semantic version of the corresponding future release and `${k}`,
is the numeric index of the current beta version, for example: 

```json
{
  "version": "0.4.0-beta.1"
}
```

and run publish with a `beta` tag:

```bash
npm publish --tag=beta
```

This allows users to install the latest beta version with 


while releases (`latest` tag) are still installed by default.

## Development

For development purposes run

```
git clone https://github.com/nextstrain/nextclade
cd nextclade/packages/web
cp .env.example .env
yarn dev

```

This will start webpack in watch mode and all changes will trigger partial rebuilds.
The build result will appear `nextclade/packages/cli/dist/nextclade.js` and can be run similarly to the production version.


## License

<a target="_blank" rel="noopener noreferrer" href="LICENSE" alt="License file">MIT License</a>
