// import w from 'src/wasm/add.webassembly.wasm'
// import mod from 'src/wasm/add.js'
// import await { add } from "src/wasm/add.wasm"
import React, { useEffect, useState } from 'react'

export interface IndexProps {}

export default function Index({}: IndexProps) {
  const [value, setValue] = useState()

  useEffect(() => {
    Promise.all([import('src/wasm/nextclade.js'), import('src/wasm/nextclade.wasm')]).then(([m, w]) => {
      console.log({ m, w })

      const module = m.default({
        locateFile(path) {
          if (path.endsWith('.wasm')) {
            return w.default
          }
          return path
        },
        onRuntimeInitialized() {
          console.log({ module })

          let mod
          module
            .then((md) => {
              mod = md
              console.log({ md })

              let res = mod.add(3, 5)
              console.log({ res })

              res = mod.concat('a', 'b')
              console.log({ res })

              setValue(res)

              mod.kaboom()
            })
            .catch((error_) => {
              console.log({ error_ })
              const msg = mod.getExceptionMessage(error_)
              console.error({ msg })
            })
        },
      })
    }, [])
  })

  return <div>{value ?? 'Calculating...'}</div>
}
