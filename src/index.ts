/**
 * @module ripcord
 */

import * as path from 'path'
require('./app')
const counsel = require('counsel')
const pkg = require('../package.json')
const report = require('./report')
import logger from './logger'
const rules = require('./rules')
const scmcycle = require('./scmcycle')
const syncPackages = require('./sync-packages-to-registry')
const licenses = require('./licenses')
const docs = require('./docs')

const ripcord = {
  /**
   * @property {Counsel} counsel counsel instance
   */
  _counsel: counsel,

  /**
   * @property {module} logger
   */
  logger: logger,

  /**
   * @property {Rule[]} set of rules to apply/check
   */
  rules: rules,

  /**
   * apply ripcord's counsel rules in project.
   * @param {string} action apply
   * @param {Commander} opts
   * @returns {Promise}
   */
  apply (action: string, opts: any) : Promise<any> {
    /* istanbul ignore next */
    return counsel.apply(this.rules)
  },

  /**
   * check ripcord's counsel rules in project.
   * @param {string} action check
   * @param {Commander} opts
   * @returns {Promise}
   */
  check (action: string, opts: any) : Promise<any> {
    /* istanbul ignore next */
    return counsel.check(this.rules)
  },

  /**
   * generate and optionally publish developer docs.
   * @param {any} action unused
   * @param {object} opts Commander
   * @param {boolean} opts.publish publish to gh-pages branch if using a github install
   * @returns {Promise}
   */
  docs (action, opts) {
    return docs.build(opts)
    .then(() => opts.publish ? docs.publish(opts) : null)
  },

  _getDest (outputPath, defaultBasename) {
    let dest = path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath)
    return counsel.project.isDir(dest) ? path.join(dest, defaultBasename) : dest
  },

  _initCounsel () {
    counsel.configKey = pkg.name
    if (process.env.RIPCORD_INSTALL) return
    // permit install process to determine if we are running in global mode or not
    // before attempting to source target package metadata.
    // it will init counsel on its own!
    try {
      counsel.setTargetPackageMeta()
    } catch (err) {
      if (err.code === 'ENOPKG') {
        counsel.logger.warn('no project package.json found. running in package free mode')
      } else {
        throw err
      }
    }
  },

  /**
   * check or dump project licenses
   * @param {string} action 'check' or 'dump'
   * @param {Commander} opts
   * @returns {Promise}
   */
  licenses (action, opts) {
    return licenses[action || 'check'](opts, this)
  },

  /**
   * generate tw project dependency report
   * @param {null} action unused
   * @param {Commander} opts unused
   * @returns {Promise}
   */
  report (action, opts) {
    return report.generate(action, opts)
  },

  /**
   * sync packages from external to local repo. run `ripcord sync-packages --dry-run`
   * for configuration instructions
   * @param {Commander} opts
   * @returns {Promise}
   */
  scmcycle (action, opts) {
    return scmcycle.run(opts)
  },

  /**
   * sync packages from external to local repo. run `ripcord sync-packages --dry-run`
   * for configuration instructions
   * @param {string} action 'syncPackages'
   * @param {Commander} opts
   * @returns {Promise}
   */
  syncPackages (action, opts) {
    return syncPackages.sync(opts)
  }
}

ripcord._initCounsel()

module.exports = ripcord
