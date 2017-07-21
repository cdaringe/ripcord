import * as path from 'path'
import * as depUtil from '../src/dep-util'

const ripcord = require('../') // include to bootstrap ripcord constants
import ava from 'ava'
const fs = require('fs')
const sinon = require('sinon')

ava('finds a file', t => {
  t.plan(1)
  return depUtil.getFirstFile([
    path.resolve(__dirname, 'totally-bogus-file'),
    __filename,
  ])
  .then(result => t.is(result, __filename, 'returns correct file'))
})
ava('returns null on no file found', t => {
  t.plan(2)
  return Promise.resolve()
  .then(() => depUtil.getFirstFile([]))
  .then(result => t.is(result, null, 'returns null on no file found'))
  .then(() => depUtil.getFirstFile([ path.resolve(__dirname, 'totally-bogus-file') ]))
  .then(result => t.is(result, null, 'returns null on no file found'))
})
