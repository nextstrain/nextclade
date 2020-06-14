# Web Clades

This app is a simple web-tool to assign [Nextstrain](https://nextstrain.org/) [clade](https://en.wikipedia.org/wiki/Clade) to the [SARS-CoV-2](https://en.wikipedia.org/wiki/Severe_acute_respiratory_syndrome_coronavirus_2) [sequences](https://en.wikipedia.org/wiki/DNA_sequencing).
It is not currently deployed anywhere and is very much work in progress.

To run in locally in development mode, do:

```bash
git clone https://github.com/neherlab/webclades
cd webclades/packages/web
cp .env.example .env
yarn install
yarn dev

```

which should serve the app on port `3000`.
