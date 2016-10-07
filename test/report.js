'use strict'

const ripcord = require('../')
const tape = require('tape')

tape('report', t => {
  t.plan(1)
  ripcord.report()
  .then(report => {
    t.ok(report.testCompile, 'report generated')
    t.end()
  })
})
