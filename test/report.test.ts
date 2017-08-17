import * as path from 'path'
import ava from 'ava'
import * as fs from 'fs-extra'
import postProcess, { REPORT_NAME_DEFAULT } from '../bin/post-process-report'
const uiBuild = require('../src/ui-build')
const ripcord = require('../')
const sinon = require('sinon')
const common = require('./util/common')
const counsel = require('counsel')
const { webpackConfigFilename, dummyUiBuildProjectDirname, linkWebpack, unlinkWebpack } = common

ava.serial('report - node/lib', async t => {
  const destDir = await fs.mkdtemp('/tmp' + path.sep)
  const report = await ripcord.report(null, { uiBuild: false })
  // valid report content
  t.is(report.package.name, 'ripcord', 'generated report has root package metadata')
  t.truthy(report.configurations.testCompile, 'generated report has configurations (compile, testCompile)')
  // valid report file
  postProcess({ options: { output: destDir } }, report)
  const reportFilename = path.join(destDir, REPORT_NAME_DEFAULT)
  const reportFileExists = await fs.exists(reportFilename)
  t.truthy(reportFileExists, 'report file generated')
})

ava.serial('report - web-build', async t => {
  const stub = sinon.stub(uiBuild, 'hasUiBuild').callsFake(() => true)
  // ^^ flag that we have webpack even though we haven't installed it in the test
  // project.  it will be imported for build from our root project!
  await linkWebpack()
  const prevRoot = counsel.targetProjectRoot
  counsel.targetProjectRoot = dummyUiBuildProjectDirname
  try {
    await ripcord.report()
    t.fail('report should fail')
  } catch (err) {
    t.truthy(err.message.match('no config'), 'fails web build without web config')
  }
  const reportConf = {
    webpackConfig: webpackConfigFilename,
    targetProjectRoot: dummyUiBuildProjectDirname
  }
  const report = await ripcord.report(null, reportConf)
  stub.restore()
  await unlinkWebpack()
  counsel.targetProjectRoot = prevRoot
  t.truthy(report.configurations.compile['dummy-pkg;0.0.1'], 'web build report included webpack injected scripts')
  t.falsy(report.configurations.testCompile['unused-dep;0.0.1'], 'web build drops unused dep')
})

ava.serial('report - web-build, ignore webbuild', async t => {
  const spy = sinon.spy(uiBuild, 'getWebpackDeps')
  const report = await ripcord.report(null, { uiBuild: false })
  t.truthy(spy.notCalled, 'ui build false prevents ui build')
  spy.restore()
})

ava.serial('report - web-build, fails if tooling missing', async t => {
  try {
    await ripcord.report() // depends on webpack being in our project root. flags this is a uiBuild project!
    t.fail('report should fail')
  } catch (err) {
    t.truthy(err.message.match('no UI build configuration'), 'biffs on no build configuration')
  }
})
