import * as path from 'path'
import postProcess, { REPORT_NAME_DEFAULT } from '../bin/post-process-report'
const uiBuild = require('../src/ui-build')
const ripcord = require('../')
const tape = require('tape')
const sinon = require('sinon')
const fs = require('fs')
const common = require('./util/common')
const counsel = require('counsel')
const { webpackConfigFilename, dummyUiBuildProjectDirname, linkWebpack, unlinkWebpack } = common

tape('report - node/lib', t => {
  t.plan(3)
  const destDir = fs.mkdtempSync('/tmp' + path.sep)
  ripcord.report(null, { uiBuild: false })
  .then(report => {
    // valid report content
    t.equals(report.package.name, 'ripcord', 'report has pkg meta')
    t.ok(report.configurations.testCompile, 'report has configurations')
    // valid report file
    postProcess({ options: { output: destDir } }, report)
    const reportFilename = path.join(destDir, REPORT_NAME_DEFAULT)
    t.ok(fs.existsSync(reportFilename), 'report file generated')
    t.end()
  })
})

tape('report - web-build', t => {
  t.plan(3)
  const stub = sinon.stub(uiBuild, 'hasUiBuild', () => true)
  // ^^ flag that we have webpack even though we haven't installed it in the test
  // project.  it will be imported for build from our root project!
  linkWebpack()
  const prevRoot = counsel.targetProjectRoot
  counsel.targetProjectRoot = dummyUiBuildProjectDirname
  Promise.resolve()
  .then(() => ripcord.report())
  .catch(err => t.ok(err.message.match('no config'), 'fails web build without web config'))
  .then(() => ripcord.report(
    null,
    { webpackConfig: webpackConfigFilename, targetProjectRoot: dummyUiBuildProjectDirname })
  )
  .then(report => {
    stub.restore()
    unlinkWebpack()
    counsel.targetProjectRoot = prevRoot
    t.ok(report.configurations.compile['dummy-pkg;0.0.1'], 'web build report included webpack injected scripts')
    t.notOk(report.configurations.testCompile['unused-dep;0.0.1'], 'web build drops unused dep')
    t.end()
  })
})

tape('report - web-build, ignore webbuild', t => {
  t.plan(1)
  const spy = sinon.spy(uiBuild, 'getWebpackDeps')
  ripcord.report(null, { uiBuild: false })
  .then(report => {
    t.ok(spy.notCalled, 'ui build false prevents ui build')
    spy.restore()
    t.end()
  })
})

tape('report - web-build, fails if tooling missing', t => {
  t.plan(1)
  Promise.resolve()
  .then(() => ripcord.report()) // depends on webpack being in our project root. flags this is a uiBuild project!
  .catch(err => t.ok(err.message.match('no UI build configuration'), 'biffs on no build configuration'))
  .then(t.end, t.end)
})
