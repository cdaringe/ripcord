const pify = require('pify')
const ripcord = require('../')
const npm = require('npm')
const scmcycle = require('../src/scmcycle')
const sinon = require('sinon')
import ava from 'ava'

ava('scmcycle entry point', t => {
  t.plan(1)
  const stub = sinon.stub(scmcycle, 'run').callsFake(t.pass('stubbed'))
  return ripcord.scmcycle()
})

ava('scmcycle', t => {
  t.plan(2)
  return pify(npm.load)({})
  .then(() => {
    npm.config.set('publish_registry', '')
  })
  .then(scmcycle.validatePrereqs)
  .catch(err => t.truthy(err.message.match(/publish_registry/), 'requires publish_registry'))
  .then(() => {
    npm.config.set('publish_registry', 'http://bananas.fruit')
    process.env.revision = process.env.branch = 'refs/heads/master'
  })
  .then(scmcycle.validatePrereqs)
  .then(readyToPublish => t.truthy(readyToPublish, 'ready to publish post validation'))
})
