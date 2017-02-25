const pify = require('pify')
const ripcord = require('../')
const npm = require('npm')
const scmcycle = require('../src/scmcycle')
const sinon = require('sinon')
const tape = require('tape')

tape('scmcycle entry point', t => {
  t.plan(1)
  const stub = sinon.stub(scmcycle, 'run', t.pass('stubbed'))
  ripcord.scmcycle()
  t.end()
})

tape('scmcycle', t => {
  t.plan(2)
  pify(npm.load)({})
  .then(() => {
    npm.config.set('publish_registry', '')
  })
  .then(scmcycle.validatePrereqs)
  .catch(err => t.ok(err.message.match(/publish_registry/), 'requires publish_registry'))
  .then(() => {
    npm.config.set('publish_registry', 'http://bananas.fruit')
    process.env.revision = process.env.branch = 'refs/heads/master'
  })
  .then(scmcycle.validatePrereqs)
  .then(readyToPublish => t.ok(readyToPublish, 'ready to publish post validation'))
  .then(t.end, t.end)
})
