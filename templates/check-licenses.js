'use strict'

const path = require('path')
const projectRoot = path.resolve(__dirname, '..')
const pkg = require(path.join(projectRoot, 'package.json'))

const WHITELIST = [
  'MIT',
  'MIT*',
  'BSD',
  'ISC'
]

const checker = require('license-checker')

if (pkg.ripcord.isOpenSource) {
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
