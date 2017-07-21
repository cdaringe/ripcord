import * as path from 'path'
import logger from '../src/logger'
import ava from 'ava'
const sinon = require('sinon')
const sync = require('../src/sync-packages-to-registry')
const npm = require('npm')
const nock = require('nock')
const pify = require('pify')
const ARTIFACTORY_URI = 'http://www.bogus.com/artifactory'
const NPM_REGISTRY_SRC = 'src'
const NPM_REGISTRY_DEST = 'dest'
const NPM_REGISTRY_SRC_CACHE = 'cache'

ava.beforeEach(async t => {
  await pify(npm.load)({})
  npm.config.set('_auth', 'test-auth')
  npm.config.set('ARTIFACTORY_URI', ARTIFACTORY_URI)
  npm.config.set('NPM_REGISTRY_SRC', NPM_REGISTRY_SRC)
  npm.config.set('NPM_REGISTRY_DEST', NPM_REGISTRY_DEST)
  npm.config.set('NPM_REGISTRY_SRC_CACHE', NPM_REGISTRY_SRC_CACHE)
})

ava.afterEach(t => {
  npm.config.set('_auth', '')
  npm.config.set('ARTIFACTORY_URI', '')
  npm.config.set('NPM_REGISTRY_SRC', '')
  npm.config.set('NPM_REGISTRY_DEST', '')
  npm.config.set('NPM_REGISTRY_SRC_CACHE', '')
})

function noCITest(name, cb) {
  if (process.env.CI) {
    return console.log([
      `skipping test on CI mode: ${name}.`,
      'CI does not resolve deps as npm naturally does',
      'hence resolved URIs cannot be reliably obtained'
    ].join(' '))
  }
  return ava(name, cb)
}

noCITest('sync env params valid', t => {
  const stub = sinon.stub(npm.config, 'get').callsFake(() => null)
  t.throws(
    () => sync._assertEnv(),
    /missing/,
    'asserts env keys not present'
  )
  stub.restore()
})

noCITest('sync - dry', t => {
  const copySpy = sinon.spy(sync, '_copyPackage')
  const getRoute = `${ARTIFACTORY_URI}/api/storage/dest/`
  // "http://www.bogus.com/artifactory/api/storage/dest/archy"
  // "http://www.bogus.com/artifactory/api/storage/dest"
  nock(getRoute).get(/.*/).times(1000).reply(200, {})
  // ^ dryRun still _may_ attempt http requests against src repo, just won't copy'
  t.plan(2)
  return sync.sync({ dryRun: true, skip: ['ripcord'] })
  .then((pkgs) => {
    t.truthy(pkgs.length, 'presents packages')
    t.falsy(copySpy.called, 'no copy operation on dryRun')
    copySpy.restore()
    nock.cleanAll()
  })
})

noCITest('sync - full sync, mocked backend', t => {
  nock(`${ARTIFACTORY_URI}/api/storage/${NPM_REGISTRY_DEST}`).get(/.*/).times(5000).reply(404, {})
  nock(`${ARTIFACTORY_URI}/api/copy/${NPM_REGISTRY_SRC_CACHE}`).post(/.*/).times(5000).reply(200, {})
  t.plan(2)
  const realSyncPackage = sync._syncPackage
  const syncPkgStub = sinon.stub(sync, '_syncPackage').callsFake((pkg) => {
    pkg.artifactoryTarball = 'bananas/-/bananas@0.0.1.tgz'
    pkg._resolved = `${ARTIFACTORY_URI}/bananas@0.0.1.tgz/${pkg.artifactoryTarball}`
    pkg.action = 'ACTION_SYNC'
    return realSyncPackage.call(sync, pkg)
  })
  return sync.sync()
  .then((pkgs) => {
    t.truthy(pkgs.length, 'presents packages')
    nock.cleanAll()
    syncPkgStub.restore()
    t.pass('teardown')
  })
})

ava('artifactory storage suffixes', t => {
  t.is(
    sync._getRemoteRelativePath('pkg', '0.0.1'),
    `pkg/-/pkg-0.0.1.tgz`,
    'non-scoped package suffix'
  )
  t.is(
    sync._getRemoteRelativePath('@scoped/pkg', '0.0.1'),
    `@scoped/pkg/-/pkg-0.0.1.tgz`,
    'scoped package suffix'
  )
})
