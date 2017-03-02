const chalk = require('chalk')
const readline = require('readline')
const fs = require('fs')
const path = require('path')
const counsel = require('counsel')

let flushRequested : boolean = true

interface PostMap {
  [key: string]: Array<string>
}

/**
 * @module logger
 * @description provide colorified console-only logging interface
 */
/* istanbul ignore next */
class Logger {
  _posts: PostMap;
  _history: any[];
  _logLevel: number;

  /**
   * @property progressMode
   * @type boolean
   * @description all stdout writes will clear current line and write back into
   * it. toggle it ad-hoc to use for a progress bar.
   */
  progressMode: boolean

  constructor () {
    this._posts = {}
    this._history = []
    this._logLevel = 2
    this.progressMode = false
  }

  /**
   * post a value to a key'd post
   * @param {string} k
   * @param {string} v
   * @returns {number}
   */
  post (k: string, v: string): number {
    const set = this._posts[k] = this._posts[k] ? this._posts[k] : []
    set.push(v)
    return set.length
  }

  /**
   * Write history and post messages to ripcord.log
   */
  flush (): void {
    fs.writeFileSync(
      path.join(process.cwd(), 'ripcord.log'),
      JSON.stringify(
        { history: this._history, posts: this._posts },
        null,
        2
      )
    )
  }

  getPosts (): PostMap {
    return this._posts
  }

  /**
   * set the log level, using npm world-style log levels
   * @param {string} level ['error', 'warn', 'info', 'verbose', 'debug']
   */
  setLogLevel (level) {
    if (level.toLowerCase() === 'silent') {
      this._logLevel = -1
      return
    }
    const levels : Array<string> = ['error', 'warn', 'info', 'verbose', 'debug']
    this._logLevel = levels.indexOf(level)
    counsel.logger.level = level
    if (this._logLevel === -1) {
      throw new Error([
        `could not find matching log level for: ${level}.`,
        `valid levels: ${levels.join(', ')}`
      ].join(' '))
    }
  }

  /**
   * @param {...any} args
   * @returns undefined
   */
  error (...args) {
    if (this._logLevel === 0) return
    const prevMode : boolean = this.progressMode
    this.progressMode = false
    this._log('stderr', chalk.bold.red, ...args)
    this.progressMode = prevMode
  }

  /**
   * @param {...any} args
   * @returns undefined
   */
  warn (...args) {
    if (this._logLevel < 1) return
    const prevMode : boolean = this.progressMode
    this.progressMode = false
    this._log('stdout', chalk.yellow, ...args)
    this.progressMode = prevMode
  }

  /**
   * @param {...any} args
   * @returns undefined
   */
  info (...args) {
    if (this._logLevel < 2) return
    this._log('stdout', chalk.blue, ...args)
  }

  /**
   * @param {...any} args
   * @returns undefined
   */
  verbose (...args) {
    if (this._logLevel < 3) return
    this._log('stdout', chalk.bold.cyan, ...args)
  }

  /**
   * @param {...any} args
   * @returns undefined
   */
  debug (...args) {
    if (this._logLevel < 3) return
    this._log('stdout', chalk.bold.cyan, ...args)
  }

  /**
   * @private
   */
  _log (streamName, colorFn, ...args) {
    if (this._logLevel === -1) return
    this._history.push({
      timestamp: (new Date()).toISOString(),
      message: [ ...args ]
    })
    if (streamName === 'stderr') {
      ;[ ...args ].forEach(msg => console.error(colorFn(msg)))
      return
    }
    if (this.progressMode) {
      readline.clearLine(process.stdout)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(args[0])
      return
    }
    console.log.apply(console, [ ...args ].map(msg => colorFn(msg)))
  }

  /**
   * Request the the ripcord log be flushed to disk on exit, regardless
   * of exit code
   */
  requestFlush (): void {
    flushRequested = true
  }
}

const logger = new Logger()
process.on('exit', code => {
  if (code || flushRequested) logger.flush()
})
export default logger
