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

Install the latest release of the [`nextclade` npm package](https://www.npmjs.com/package/@neherlab/nextclade) globally:

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
All files have the same format as exports from the [Nextclade web application](clades.nextstrain.org).


## Build

This will build a production version of the command-line tool:

```bash
git clone https://github.com/neherlab/webclades
cd webclades/packages/web
cp .env.example .env
yarn cli:prod:build
```

The bundled npm script will appear as `webclades/packages/cli/dist/nextclade.js`.
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
cd webclades/packages/web
yarn cli:prod:build:exe
```

The native executables for various platforms will appear in `webclades/packages/cli/dist/`.
This uses [`pkg`](https://github.com/vercel/pkg) tool to wrap the script together with Node.js runtime into one standalone file. 


## Publish

This describes how to publish a new version of the package on NPM.
After build step above, increment the version in `webclades/packages/cli/package.json`:

```json
{
  "version": "x.y.z"
}
```

and run:

```bash
cd webclades/packages/cli
npm publish
```

If you need to re-publish the same version (which npm disallows), append an index of the re-release after a dash,
 using the following format: `${x.y.z}-{k}`, for example: 

```json
{
  "version": "0.4.0-1"
}
```

In order to publish a beta version, name the version in `webclades/packages/cli/package.json` using
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
git clone https://github.com/neherlab/webclades
cd webclades/packages/web
cp .env.example .env
yarn dev

```

This will start webpack in watch mode and all changes will trigger partial rebuilds.
The build result will appear `webclades/packages/cli/dist/nextclade.js` and can be run similarly to the production version.


## License

<a target="_blank" rel="noopener noreferrer" href="LICENSE" alt="License file">MIT License</a>
