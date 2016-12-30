#!/usr/bin/env node

'use strict'

import * as path from 'path'
const perish = require('perish')
const app = require('../src/app')
import postProcessReport from './post-process-report'
const program = require('commander')
const pkgPath = path.resolve(__dirname, '../package.json')
const pkg = require(pkgPath)
const ripcord = require('../src/')
const counsel = require('counsel')
const cpojo = require('commander-pojo') // see ripcord#39

// CLI command metadata. `name` refers to a corresponding function in
// ripcord's library entry point (ref, src/index.js)
let action = { name: null, arg: null, options: null }

function fromCSV (v) { return v.split(',').map(s => s.trim()) }

// attempt usage of local ripcord, if present
function prog () {
  try {
    let localRipcordFilename = path.join(process.cwd(), 'node_modules', 'ripcord', 'bin', 'ripcord')
    localRipcordFilename = require.resolve(localRipcordFilename)
    /* istanbul ignore next */
    if (__filename !== localRipcordFilename) return require(localRipcordFilename)
  } catch (err) { /* pass */ }

  // expose and digest CLI
  program
    .version(pkg.version)
  program
    .option('-l, --log-level [error|warn|info|verbose|debug|silly]', 'set the log level. default info')
    .option('--verbose', 'set the log level to verbose')
    .option('-u, --no-ui-build', 'disable web ui build if web build tooling detected')
    .option('-w, --webpack-config <filename>', 'path to webpack config file')

  program
    .command('report')
    .option('-o, --output <dir|filename>', 'path to dump the report')
    .description('generate dependency report')
    .action((opts) => {
      /* istanbul ignore next */
      action = { name: 'report', arg: null, options: opts }
    })

  program
    .command('counsel <apply|check>')
    .description('deploy project conventions via counsel')
    .action((arg, opts) => {
      /* istanbul ignore next */
      action = { name: 'counsel', arg: arg, options: opts }
    })

  program
    .command('licenses <check|dump>')
    .option('-f, --force', 'force dep report, even if package marked as `devOnly`')
    .option('-o, --output <dir|filename>', 'output to dir or to file when check fails, or on dump request')
    .option('-c, --csv', 'csv output. output mode defaults to JSON')
    .option('-d, --dev', 'inlcude package licenses')
    .description([
      'check or dump project licenses. ONLY outputs licenses for `dependencies`',
      'not `devDependencies` by default.'
    ].join(' '))
    .action((arg, opts) => {
      /* istanbul ignore next */
      action = { name: 'licenses', arg: arg, options: opts }
    })

  program
    .command('sync-packages')
    .option('--limit <list,of,pkgs>', 'copy only limited packages', fromCSV)
    .option(
      '--concurrency <int>',
      'number of concurrent copy to requests permitted during sync. defaults to 8',
      v => parseInt(v, 10)
    )
    .option('-d, --dry-run', 'show packages to copy')
    .option('-s, --skip [list,of,pkgs]', 'skip copying packages', fromCSV)
    .description('sync packages from external npm repo to internal repo')
    .action((opts) => {
      /* istanbul ignore next */
      action = { name: 'syncPackages', arg: null, options: opts }
    })

  program
    .command('docs')
    .description('generate dev docs')
    .option('-p, --publish', 'generate docs and publish them to github pages')
    .action((opts) => {
      /* istanbul ignore next */
      action = { name: 'docs', arg: null, options: opts }
    })

  program
    .command('scmcycle')
    .description('exec scmcycle')
    .action((opts) => {
      /* istanbul ignore next */
      action = { name: 'scmcycle', arg: null, options: opts }
    })

  program.parse(process.argv)
  action.options = Object.assign(cpojo(action.options), cpojo(program, { mergeParent: true })) // @TODO see ripcord#39

  // validate command line input
  const args = program.args ? program.args.filter(a => a) : []
  const hasArgs = args && args.length > 0
  const isValidArg = hasArgs ? (args[0] instanceof program.Command || args[1] instanceof program.Command) : false
  /* istanbul ignore else */
  if (!hasArgs || !isValidArg) {
    ripcord.logger.error('invalid args passed')
    program.outputHelp()
    process.exit(1)
  }

  // configure logging
  perish.printStacktrace = false
  if (program.verbose) {
    program.logLevel = 'verbose'
  }
  counsel.logger.transports.console.level = program.logLevel || app.logLevel
  ripcord.logger.setLogLevel(program.logLevel || app.logLevel)
  if (ripcord.logger._logLevel > 2) perish.printStacktrace = true

  // go.
  action.options = action.options || {}
  const cmdP = ripcord[action.name](action.arg, action.options)
  Promise.resolve(cmdP)
  .then(result => {
    /* istanbul ignore next */
    if (action.name === 'report') postProcessReport(action, result)
  })

  return program
}

module.exports = prog()
