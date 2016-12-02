'use strict'

const path = require('path')
const bin = path.join(__dirname, '../bin/ripcord')
const cp = require('child_process')
const tape = require('tape')

tape('report', t => {
  const noArgRun = cp.spawnSync(bin)
  t.equals(noArgRun.status, 1, 'exits w/ 1 on invalid cmd')
  t.end()
})
