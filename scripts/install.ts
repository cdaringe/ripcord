import * as cp from 'child_process'
import { resolve } from 'path'
import { project } from 'counsel'
const ripcord = require('../src/index')

Promise.resolve()
.then(() => project.findProjectRoot(resolve(__dirname, '..', '..')))
.catch(err => {
  console.warn([
    'unable to install ripcord rules. if this was a global install, fear not',
    `and proceed. ${err.message}`
  ].join(' '))
  process.exit(0)
})
.then(() => {
  ripcord.logger.setLogLevel('verbose')
  return ripcord.counsel('apply', null)
})
.then(() => ripcord._counsel.logger.info('install success'))
