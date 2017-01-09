import * as cp from 'child_process'
import { resolve } from 'path'
import { project } from 'counsel'

try {
  const root = project.findProjectRoot(resolve(__dirname, '..', '..'))
  cp.exec('node bin/ripcord.js counsel apply', { cwd: resolve(__dirname, '..') })
  console.log('[ripcord] install success')
} catch (err) {
  console.warn([
    'unable to install ripcord rules. if this was a global install, fear not',
    `and proceed. ${err.message}`
  ].join(' '))
}
