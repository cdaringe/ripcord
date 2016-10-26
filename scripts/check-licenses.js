'use strict'

require('perish')
const path = require('path')
const projectRoot = path.resolve(__dirname, '..')
const pkg = require(path.join(projectRoot, 'package.json'))
let ripcord
try {
  ripcord = require('ripcord')
} catch (err) {
  // @TODO dirty hack for dogfooding
  ripcord = require('../')
}

const WHITELIST = [
  'MIT',
  'MIT*',
  'BSD',
  'ISC'
]

const checker = require('license-checker')

if (pkg[ripcord._counsel.configKey].devOnly) {
  process.exit(0)
}

checker.init({
  start: projectRoot,
  json: true,
  exclude: WHITELIST.join(','),
  production: true,
  development: false
}, function (err, pkgs) {
  if (err) throw err
  if (Object.keys(pkgs).length) {
    console.error('package.dependencies do not have approved licenses:')
    console.error(JSON.stringify(pkgs, null, 2))
    process.exit(1)
  }
})
