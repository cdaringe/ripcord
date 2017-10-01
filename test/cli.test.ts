import * as path from 'path'
const bin = path.join(__dirname, '../bin/ripcord.js')
const cp = require('child_process')
import ava from 'ava'

ava('cli - bogus cmd', t => {
  const noArgRun = cp.spawnSync(bin)
  if (noArgRun.error) {
    return t.fail(`unable to run test. ${noArgRun.error.message}`)
  }
  t.is(noArgRun.status, 1, 'exits w/ 1 on invalid cmd')
})

ava('cli - valid cmd', t => {
  const helpRun = cp.spawnSync(bin, ['--help'])
  if (helpRun.status) {
    return t.fail(`unable to run ripcord command. err message: ${helpRun.stderr}`)
  }
  t.is(helpRun.status, 0, 'exits w/ 1 on invalid cmd')
})
