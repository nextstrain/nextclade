/* eslint-disable unicorn/no-process-exit,unicorn/prefer-module */
/**
 * Serves production build artifacts.
 *
 * /!\ Only for development purposes, e.g. verifying that production build runs
 * on developer's machine.
 *
 * This server is very naive, slow and insecure. Real-world deployments should
 * use either a 3rd-party static hosting or a robust static server, such as
 * Nginx, instead.
 *
 */

import type { ServerResponse } from 'http'
import path from 'path'

import express from 'express'

import allowMethods from 'allow-methods'
import history from 'connect-history-api-fallback'
import expressStaticGzip from 'express-static-gzip'

import { getenv } from '../../lib/getenv'
import { modifyHeaders } from '../../infra/lambda-at-edge/modifyOutgoingHeadersForApi.lambda'

export interface NewHeaders {
  [key: string]: { key: string; value: string }[]
}

function main() {
  if (process.argv.length < 3) {
    console.error('Error: Positional argument is required: path to a data directory')
    console.error(`Usage:\n  ${process.argv[0]} ${path.basename(__filename)} <path_to_data_dir>`)
    process.exit(0)
  }

  const dataDir = process.argv[2]

  const app = express()

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const newHeaders = modifyHeaders({ /* request: req, */ response: res }) as NewHeaders
    Object.entries(newHeaders).forEach(([header, arr]) => {
      const [{ value }] = arr
      if (header.toLowerCase() === 'strict-transport-security') {
        return
      }
      res.set({ [header.toLowerCase()]: value })
    })
    next()
  })

  app.use(allowMethods(['GET', 'HEAD']))
  app.use(history())
  app.get(
    '*',
    expressStaticGzip(dataDir, {
      enableBrotli: false,
      serveStatic: {
        setHeaders: (res: ServerResponse) => {
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Max-Age', '3000')
        },
      },
    }),
  )

  const port = getenv('DATA_LOCAL_PORT')
  app.listen(port, () => {
    console.info(`Serving ${dataDir} on http://localhost:${port}`)
  })
}

main()
