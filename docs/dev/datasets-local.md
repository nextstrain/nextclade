# Test datasets locally

This guide describes how to change dataset server URL in Nextclade CLI and Nextclade Web and how to run your own local dataset server. This is useful for the development of datasets functionality and for testing new datasets locally.

See https://github.com/nextstrain/nextclade_data on how create a custom dataset repository directory.

## Use custom dataset server

- Set `DATA_FULL_DOMAIN` variable in `.env` file in the root of the project to the full domain of your server (see `.env.example`):

   ```
   DATA_FULL_DOMAIN=https://example.com
   ```

- Rebuild Nextclade Web or Nextclade CLI
- Nextclade Web or Nextclade CLI should be using the new server URL now

Note that [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) should be enabled on your server.

## Run local dataset server

It is sufficient to serve the dataset repository directory with any static file server with [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) enabled.

For convenience, a Node.js server script in included in [packages/web/tools/server/dataServer.ts](../../packages/web/tools/server/dataServer.ts).

In order to run and use the server:

- Install Node 14 (we recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions)

- Install web dependencies once:
   ```bash
   cd nextclade/packages/web
   yarn install
   ```

- Set `DATA_OUTPUT_DIR_RELATIVE` variable in `.env` file to a relative path of a Nextclade dataset repository build (see `.env.example`). For the default data curation workflow (https://github.com/nextstrain/nextclade_data) this will be the `data_output/` directory of the `nextclade_data` project:

  ```
  DATA_OUTPUT_DIR_RELATIVE=../nextclade_data/data_output
  ```

  Make sure you rebuild the datasets in order for `data_output/` directory to appear. Refer to documentation in https://github.com/nextstrain/nextclade_data for more details.

- Start the server:

   ```bash
   cd <root of the project>
   npx serve --cors --listen=tcp://0.0.0.0:27722 data_output/
   ```
  The server then can be reached from

  ```
  http://localhost:27722
  ```

  The port number can be configured using `DATA_LOCAL_PORT` environment variable)

- Verify that the server is reachable. Paste this address to the browser:

    ```
    http://localhost:27722/index.json
    ```

  or run

  ```bash
  curl http://localhost:27722/index.json
  ```

  It should display the datasets JSON index file.


- Set local server's URL as a custom dataset server (see: [Use custom dataset server](#use-custom-dataset-server)) in  `.env` file
  
  ```
  DATA_FULL_DOMAIN=http://localhost:27722
  ```

  Adjust port number if `DATA_LOCAL_PORT` was changed.

 - Rebuild Nextclade CLi and/or Nextclade Web and they will use the local datasets instead of the ones on AWS.
