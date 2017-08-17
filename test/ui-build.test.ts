import * as assert from 'assert'
const common = require('./util/common')
import ava from 'ava'
const uiBuild = require('../src/ui-build')
const report = require('../src/report')
const sinon = require('sinon')
const { dummyUiBuildProjectDirname, webpackConfigFilename, wpStub, linkWebpack, unlinkWebpack } = common
const counsel = require('counsel')

async function getDummyPkgs (opts) {
  const dOpts = Object.assign(
    { targetProjectRoot: dummyUiBuildProjectDirname },
    opts || {}
  )
  const deps = await report.getDependencies(dOpts)
  assert.ok(deps['dummy-pkg'], 'dummy-pkg located')
  assert.ok(deps['unused-pkg'], 'unused-pkg located')
  return deps
}

// will fail on windows machines! @TODO update paths to be windows friendly
ava('webpack - name extraction', t => {
  t.throws(() => uiBuild._extractWebpackNodeModulePackageName('..'), Error, 'biffs on no pkg name')
  t.throws(() => uiBuild._extractWebpackNodeModulePackageName('../~'), Error, 'biffs on no pkg name')
  t.throws(() => uiBuild._extractWebpackNodeModulePackageName('node_modules/~'), Error, 'biffs on no pkg name')
  t.throws(() => uiBuild._extractWebpackNodeModulePackageName('~/node_modules'), Error, 'biffs on no pkg name')
  t.is(
    uiBuild._extractWebpackNodeModulePackageName('/beep/bop/~/boop/blah'),
    'boop',
    'detects pkg name'
  )
  t.is(
    uiBuild._extractWebpackNodeModulePackageName('../~/boop/blah'),
    'boop',
    'detects pkg name'
  )
  t.is(
    uiBuild._extractWebpackNodeModulePackageName('../~/@beep/bop/bif'),
    '@beep/bop',
    'detects pkg name'
  )
  t.is(
    uiBuild._extractWebpackNodeModulePackageName('../!!!0#)@(*/node_modules/@beep/bop'),
    '@beep/bop',
    'detects pkg name'
  )
})

ava('ui build fails without build config', async t => {
  // let hasUiBuildStub = sinon.stub(uiBuild, 'hasUiBuild', () => true)
  const pkgs = await getDummyPkgs({ uiBuild: false })
  pkgs.webpack = wpStub // stub in dummy webpack dependency to IPkgSet report
  try {
    await uiBuild.applyWebBuildTransform(Object.assign({}, pkgs))
    t.fail('build shoud fail')
  } catch (err) {
    t.truthy(
      err.message.match('build configuration'),
      'errors if no ui build configuration passed'
    )
  }
})

ava('ui dependencies transform flatly', async t => {
  const prevRoot : string = counsel.targetProjectRoot
  await linkWebpack()
  counsel.targetProjectRoot = dummyUiBuildProjectDirname
  const pkgs = await getDummyPkgs({ uiBuild: false })
  pkgs.webpack = wpStub // stub in webpack
  const webTransformedPkgs = await uiBuild.applyWebBuildTransform(
    pkgs,
    { uiBuild: true, webpackConfig: webpackConfigFilename }
  )
  t.is(webTransformedPkgs['dummy-pkg;0.0.1'].production, true, 'devDep consumed by build transfers to prod dep')
  counsel.targetProjectRoot = prevRoot
  await unlinkWebpack()
})
