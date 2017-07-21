process.env.RIPCORD_INSTALL = 'true'
import * as cp from 'child_process'
import { resolve } from 'path'
import { project } from 'counsel'
const ripcord = require('../src/index')

Promise.resolve()
.then(() => {
  var start : string = process.env.PROJECT_ROOT ? process.cwd() : resolve(__dirname, '..', '..')
  return project.findProjectRoot(start)
})
.catch(err => {
  // if ENOPKG detected, assume global install or uninitialized package.
  // proceed gracefully, vs crash.
  if (err.code !== 'ENOPKG') throw err
  if (!process.env.npm_config_global) {
    // ^^ handle yarn too? https://github.com/yarnpkg/yarn/issues/2472
    console.warn([
      'unable to install ripcord rules. if this was a global install, fear not',
      `and proceed. ${err.message}`
    ].join(' '))
  }
})
.then(rootPath => {
  if (typeof rootPath !== 'string') return // do no rule application if we found no project
  ripcord._counsel.setTargetPackageMeta()
  ripcord.logger.setLogLevel('verbose')
  return ripcord.apply(null)
})
.then(() => ripcord._counsel.logger.info('install success'))
