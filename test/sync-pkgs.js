'use strict'

const tape = require('tape')
const sinon = require('sinon')
const sync = require('../src/sync-packages-to-registry')
const npm = require('requireg')('npm')
const logger = require('../src/logger')
const nock = require('nock')

const ARTIFACTORY_URI = 'http://www.bogus.com/artifactory'
const NPM_SRC_ARTIFACTORY_URI = 'http://www.bogus.com/artifactory/src'
const NPM_DEST_ARTIFACTORY_URI = 'http://www.bogus.com/artifactory/dest'
const NPM_SRC_CACHE_ARTIFACTORY_URI = 'http://www.bogus.com/artifactory/cache'

const setupNpmConfig = () => {
  npm.config.set('_auth', 'test-auth')
  npm.config.set('ARTIFACTORY_URI', ARTIFACTORY_URI)
  npm.config.set('NPM_SRC_ARTIFACTORY_URI', NPM_SRC_ARTIFACTORY_URI)
  npm.config.set('NPM_DEST_ARTIFACTORY_URI', NPM_DEST_ARTIFACTORY_URI)
  npm.config.set('NPM_SRC_CACHE_ARTIFACTORY_URI', NPM_SRC_CACHE_ARTIFACTORY_URI)
}

const teardownNpmConfig = () => {
  npm.config.set('_auth', '')
  npm.config.set('ARTIFACTORY_URI', '')
  npm.config.set('NPM_SRC_ARTIFACTORY_URI', '')
  npm.config.set('NPM_DEST_ARTIFACTORY_URI', '')
  npm.config.set('NPM_SRC_CACHE_ARTIFACTORY_URI', '')
}

tape('setup', t => {
  t.plan(1)
  logger.setLogLevel('silent')
  return sync._loadNpm()
  .then(() => t.pass('sync setup'))
  .catch(t.fail)
  .then(t.end)
})

tape('sync env params valid', t => {
  setupNpmConfig()
  const stub = sinon.stub(npm.config, 'get', () => null)
  t.throws(() => {
    sync._assertEnv()
  }, /missing/, 'asserts env keys not present')
  stub.restore()
  teardownNpmConfig()
  t.end()
})

tape('sync - dry', t => {
  setupNpmConfig()
  const copySpy = sinon.spy(sync, '_copyPackage')
  nock(NPM_SRC_ARTIFACTORY_URI).get(/.*/).reply(200, {})
  // ^ dryRun still _may_ attempt http requests against src repo, just won't copy'
  t.plan(2)
  return sync.sync({ dryRun: true })
  .then((pkgs) => {
    t.ok(pkgs.length, 'presents packages')
    t.notOk(copySpy.called, 'no copy operation on dryRun')
    copySpy.restore()
    nock.cleanAll()
    t.end()
  })
})

tape('sync - fo real', t => {
  setupNpmConfig()
  const copySpy = sinon.spy(sync, '_copyPackage')
  nock(NPM_SRC_ARTIFACTORY_URI).get(/.*/).times(1000).reply(404, {})
  nock(NPM_SRC_CACHE_ARTIFACTORY_URI).post(/.*/).times(1000).reply(200, {})
  t.plan(2)
  return sync.sync({ forceCopy: true })
  .then((pkgs) => {
    t.ok(pkgs.length, 'presents packages')
    t.ok(copySpy.called, 'no copy operation on dryRun')
    copySpy.restore()
    nock.cleanAll()
    t.end()
  })
})
