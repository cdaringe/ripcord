'use strict'

const ripcord = require('../')
const tape = require('tape')

tape('report', t => {
  t.pass('blah')
  t.end()
  // ripcord.report()
})
