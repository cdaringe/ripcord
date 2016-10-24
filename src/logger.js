'use strict'

const chalk = require('chalk')

/* istanbul ignore next */
module.exports = {

  _logLevel: 2,

  setLogLevel (level) {
    const levels = ['error', 'warn', 'info', 'verbose', 'debug']
    this._logLevel = levels.indexOf(level)
    if (this._logLevel === -1) {
      throw new Error([
        `could not find matching log level for: ${level}.`,
        `valid levels: ${levels.join(', ')}`
      ].join(' '))
    }
  },

  error (...args) {
    this._log('stderr', chalk.bold.red, ...args)
  },

  warn (...args) {
    if (this._logLevel < 1) return
    this._log('stdout', chalk.yellow, ...args)
  },

  info (...args) {
    if (this._logLevel < 2) return
    this._log('stdout', chalk.blue, ...args)
  },

  verbose (...args) {
    if (this._logLevel < 3) return
    this._log('stdout', chalk.bold.cyan, ...args)
  },

  debug (...args) {
    if (this._logLevel < 3) return
    this._log('stdout', chalk.bold.cyan, ...args)
  },

  _log (streamName, colorFn, ...args) {
    if (streamName === 'stderr') {
      ;[ ...args ].forEach(msg => console.error(colorFn(msg)))
      return
    }
    console.log.apply(console, [ ...args ].map(msg => colorFn(msg)))
  }
}
