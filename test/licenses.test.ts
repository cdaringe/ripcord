import * as path from 'path'
import {
  dummyUiBuildProjectDirname,
  webpackConfigFilename,
  wpStub,
  linkWebpack,
  unlinkWebpack
} from './util/common'
import ava from 'ava'
const sinon = require('sinon')
const ripcord = require('../')
const licenses = require('../src/licenses')
const uiBuild = require('../src/ui-build')
const fs = require('fs')
const counsel = require('counsel')

ava('fails with unapproved licenses', async t => {
  const origHandleGetLicensesCheck = licenses._checkLicenses
  const stub = sinon.stub(licenses, '_checkLicenses').callsFake((pkgs, opts, rc) => {
    pkgs = { 'dummy-pkg': { name: 'dummy-pkg', version: '0.0.1', from: ['blah', 'blah'] } }
    return origHandleGetLicensesCheck.apply(licenses, [pkgs, opts, ripcord])
  })
  try {
    await ripcord.licenses('check', { force: true, throwOnFail: true, uiBuild: false })
    t.fail('should fail w/ bogus licenses')
  } catch (err) {
    t.truthy(err.message.match(/unapproved/), 'biffs on unapproved licenses')
  }
  stub.restore()
})

ava('license dump', async t => {
  const destDir = fs.mkdtempSync('/tmp' + path.sep)
  const destFilename = path.join(destDir, 'test-dump.csv')
  await ripcord.licenses(
    'dump',
    { csv: true, dev: true, throwOnFail: true, output: destFilename, uiBuild: false }
  )
  t.truthy(fs.existsSync(destFilename, 'dump generated'))
})

ava('license check, web-build', async t => {
  const opts = {
    dev: true,
    force: true,
    throwOnFail: true,
    targetProjectRoot: dummyUiBuildProjectDirname,
    webpackConfig: webpackConfigFilename
  }
  t.plan(1)
  const wStub = uiBuild.applyWebBuildTransform
  const transformStub = sinon.stub(uiBuild, 'applyWebBuildTransform').callsFake((pkgs, opts) => {
    pkgs.webpack = wpStub
    return wStub.call(uiBuild, pkgs, opts)
  })
  try {
    await ripcord.licenses('check', opts)
    t.fail('should fail w/ bogus licenses')
  } catch (err) {
    t.truthy(err.message.match(/unapproved/), 'biffs on unapproved licenses')
  }
  transformStub.restore()
})

ava('license dump, web-build', async t => {
  const opts = {
    csv: true,
    dev: true,
    force: true,
    _ignoreNonLogicalDependenices: true, // hack around snyk-resolve-deps not finding symlinked webpack child deps
    throwOnFail: true,
    targetProjectRoot: dummyUiBuildProjectDirname,
    webpackConfig: webpackConfigFilename
  }
  t.plan(1)
  const wStub = uiBuild.applyWebBuildTransform
  const stub = sinon.stub(uiBuild, 'applyWebBuildTransform').callsFake((pkgs, opts) => {
    pkgs.webpack = wpStub
    return wStub.call(uiBuild, pkgs, opts)
  })
  const oldTargetProjectRoot = counsel.targetProjectRoot
  counsel.targetProjectRoot = dummyUiBuildProjectDirname
  const goldenFilename = path.join(dummyUiBuildProjectDirname, 'ui-license-dump-golden.csv')
  const goldenDump = fs.readFileSync(goldenFilename).toString().trim()

  unlinkWebpack()
  linkWebpack()
  var dump = await ripcord.licenses('dump', opts)
  t.is(dump.trim(), goldenDump, 'ui build dump matches golden dump')
  counsel.targetProjectRoot = oldTargetProjectRoot
  stub.restore()
  unlinkWebpack()
})

