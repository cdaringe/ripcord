'use strict'

const tape = require('tape')
const sinon = require('sinon')
const ripcord = require('../')
const licenses = require('../src/licenses')
const path = require('path')
const fs = require('fs')

tape('license check', t => {
  const origHandleGetLicensesCheck = licenses._handleGetLicensesCheck
  const stub = sinon.stub(licenses, '_handleGetLicensesCheck', (pkgs, opts, rc) => {
    pkgs = { name: 'dummy-pkg', version: '0.0.1' }
    return origHandleGetLicensesCheck.apply(licenses, [pkgs, opts, ripcord])
  })
  t.plan(2)
  Promise.resolve()
  .then(() => ripcord.licenses('check', { force: true, throwOnFail: true }))
  .then(t.fail)
  .catch(err => t.ok(err.message.match(/unapproved/), 'biffs on unapproved licenses'))
  .then(() => stub.restore())
  .then(() => t.pass('license check teardown'))
  .then(t.end, t.end)
})

tape('license dump', t => {
  t.plan(1)
  const destDir = fs.mkdtempSync('/tmp' + path.sep)
  const destFilename = path.join(destDir, 'test-dump.csv')
  Promise.resolve()
  .then(() => ripcord.licenses(
    'dump',
    { csv: true, dev: true, throwOnFail: true, output: destFilename }
  ))
  .then(() => t.ok(fs.existsSync(destFilename, 'dump generated')))
  .then(t.end, t.end)
})
