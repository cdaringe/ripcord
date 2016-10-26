'use strict'

const ripcord = require('../')
const tape = require('tape')
const postProcess = require('../bin/post-process-report')
const fs = require('fs')
const path = require('path')

tape('report', t => {
  t.plan(3)
  const destDir = fs.mkdtempSync('/tmp' + path.sep)
  ripcord.report()
  .then(report => {
    // valid report content
    t.equals(report.package.name, 'ripcord', 'report has pkg meta')
    t.ok(report.configurations.testCompile, 'report has configurations')
    // valid report file
    postProcess({ options: { output: destDir } }, report)
    const reportFilename = path.join(destDir, postProcess.REPORT_NAME_DEFAULT)
    t.ok(fs.existsSync(reportFilename), 'report file generated')
    t.end()
  })
})
