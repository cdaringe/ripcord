import * as cp from 'child_process'
import { resolve } from 'path'
import { project } from 'counsel'
const exec = pify(cp.exec)

Promise.resolve()
.then(() => project.findProjectRoot(resolve(__dirname, '..', '..')))
.catch(err => {
  console.warn([
    'unable to install ripcord rules. if this was a global install, fear not',
    `and proceed. ${err.message}`
  ].join(' '))
  process.exit(0)
})
.then(() => exec('node bin/ripcord.js counsel apply', { cwd: resolve(__dirname, '..') }))
.then(() => console.log('[ripcord] install success'))
