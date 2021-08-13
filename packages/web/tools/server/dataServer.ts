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

import path from 'path'

import express, { Response } from 'express'

import allowMethods from 'allow-methods'
import history from 'connect-history-api-fallback'
import expressStaticGzip from 'express-static-gzip'

import { getenv } from '../../lib/getenv'
import { findModuleRoot } from '../../lib/findModuleRoot'

import { modifyHeaders } from '../../infra/lambda-at-edge/modifyOutgoingHeaders.lambda'

const { moduleRoot } = findModuleRoot()

const DATA_OUTPUT_DIR_RELATIVE = getenv('DATA_OUTPUT_DIR_RELATIVE')
const DATA_OUTPUT_DIR = path.join(moduleRoot, '..', '..', DATA_OUTPUT_DIR_RELATIVE)

export interface NewHeaders {
  [key: string]: { key: string; value: string }[]
}

function main() {
  const app = express()

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const newHeaders = modifyHeaders({ request: req, response: res }) as NewHeaders
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
    expressStaticGzip(DATA_OUTPUT_DIR, {
      enableBrotli: false,
      serveStatic: {
        setHeaders: (res: Response) =>
          res.set({
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Methods': 'GET, HEAD',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Max-Age': '3000',
          }),
      },
    }),
  )

  const port = getenv('DATA_LOCAL_PORT')
  app.listen(port, () => {
    console.info(`Serving ${DATA_OUTPUT_DIR} on http://localhost:${port}`)
  })
}

main()
