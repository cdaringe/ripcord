'use strict'

const ripcord = require('../')
const tape = require('tape')

tape('report', t => {
  t.ok(ripcord.report().testCompile, 'report generated')
  t.end()
})
