const fs = require('fs-extra')
const path = require('path')

/* eslint-disable no-loops/no-loops,no-param-reassign,no-plusplus */
module.exports = {
  findModuleRoot(maxDepth = 10) {
    let moduleRoot = __dirname
    while (--maxDepth) {
      moduleRoot = path.resolve(moduleRoot, '..')
      const file = path.join(moduleRoot, 'package.json')
      if (fs.existsSync(file)) {
        const pkg = fs.readJsonSync(file)
        if (!pkg.name || typeof pkg.name !== 'string' || pkg.name.trim() === '') {
          throw new Error('package.json is missing a valid "name" field')
        }
        if (!pkg.version || typeof pkg.version !== 'string' || pkg.version.trim() === '') {
          throw new Error('package.json is missing a valid "version" field')
        }
        return { moduleRoot, pkg }
      }
    }
    throw new Error('Module root not found')
  },
}
