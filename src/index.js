/**
 * @module ripcord
 */

'use strict'

require('perish')
const counsel = require('counsel')
const pkg = require('../package.json')
const report = require('./report')
const logger = require('./logger')
const rules = require('./rules')
const syncPackages = require('./sync-packages-to-registry')

// counsel init
counsel.configKey = pkg.name
counsel.setTargetPackageMeta()

module.exports = {
  /**
   * @property {Counsel} counsel counsel instance
   */
  _counsel: counsel,

  /**
   * @property {string} projectRoot full path of target project
   */
  projectRoot: counsel.project.findProjectRoot(),

  /**
   * @property {module} logger
   */
  logger: logger,

  /**
   * @property {Rule[]} set of rules to apply/check
   */
  rules: rules,

  /**
   * apply or check ripcord's counsel rules in project.
   * @param {string} action 'apply' or 'check'
   * @param {Commander} opts
   * @returns {Promise}
   */
  counsel (action, opts) {
    /* istanbul ignore next */
    if (action === 'apply') {
      return counsel.apply(this.rules)
    } else if (action === 'check') {
      return counsel.check(this.rules)
    } else {
      let errMsg = `"${action}" not a valid ripcord counsel argument`
      if (!action) errMsg = 'ripcord counsel requires an argument'
      counsel.logger.error(errMsg)
      process.exit(1)
    }
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
   * @param {string} action 'syncPackages'
   * @param {Commander} opts
   * @returns {Promise}
   */
  syncPackages (action, opts) {
    return syncPackages.sync({ dryRun: !!opts.dryRun })
  }
}
