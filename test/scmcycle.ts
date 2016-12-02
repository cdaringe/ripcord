const ripcord = require('../')
const scmcycle = require('../src/scmcycle')
const sinon = require('sinon')
const tape = require('tape')

tape('scmcycle', t => {
  const stub = sinon.stub(scmcycle, 'run', t.pass('stubbed'))
  ripcord.scmcycle()
  t.end()
})
