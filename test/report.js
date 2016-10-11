'use strict'

const ripcord = require('../')
const tape = require('tape')

tape('report', t => {
  t.plan(2)
  ripcord.report()
  .then(report => {
    t.equals(report.package.name, 'ripcord', 'report has pkg meta')
    t.ok(report.configurations.testCompile, 'report has configurations')
    t.end()
  })
})
