// import w from 'src/wasm/add.webassembly.wasm'
// import mod from 'src/wasm/add.js'
// import await { add } from "src/wasm/add.wasm"
import React, { useEffect, useState } from 'react'

export interface IndexProps {}

export default function Index({}: IndexProps) {
  const [value, setValue] = useState()

  useEffect(() => {
    Promise.all([import('src/wasm/add.webassembly.js'), import('src/wasm/add.webassembly.wasm')]).then(([m, w]) => {
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

          module.then((md) => {
            console.log({ md })
            const res = md.add(3, 5)
            console.log({ res })

            setValue(res)
          })
        },
      })
    })
  })

  return <div>{value ?? 'Calculating...'}</div>
}
