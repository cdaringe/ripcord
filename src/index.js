'use strict'

const counsel = require('counsel')
const Rule = require('counsel-rule')
const ScriptRule = require('counsel-script')
const CopyRule = require('counsel-copy')
const PreCommitRule = require('counsel-precommit')
const pkg = require('../package.json')
const cp = require('child_process')
const path = require('path')

counsel.configKey = pkg.name

const COPY_CONTENT_ROOT = path.resolve(__dirname, '..')

module.exports = {
  _counsel: counsel,
  _projectRoot: counsel.project.findProjectRoot(),

  /**
   * apply or check ripcord's counsel rules in project.
   * @param {string} action
   * @param {Commander} opts
   * @returns {Promise}
   */
  counsel (action, opts) {
    /* istanbul ignore next */
    if (action === 'apply') {
      return counsel.apply(this.rules)
    } else if (action === 'check') {
      return counsel.logger.error('check not yet implemented')
    } else {
      let errMsg = `"${action}" not a valid ripcord counsel argument`
      if (!action) errMsg = 'ripcord counsel requires an argument'
      counsel.logger.error(errMsg)
      process.exit(1)
    }
  },

  /**
   * @TODO `npm ls` ==> https://snyk.io/blog/tackling-the-new-npm@3-dependency-tree/
   * generate tw project dependency report
   * @param {null} action
   * @param {Commander} opts
   */
  report (action, opts) {
    let prd
    let dev
    try {
      prd = JSON.parse(cp.execSync('npm ls --prod --json', { cwd: this._projectRoot }).toString())
      dev = JSON.parse(cp.execSync('npm ls --dev --json', { cwd: this._projectRoot }).toString())
    } catch (err) {
      /* istanbul ignore next */
      if (err.message.match(/extraneous/)) {
        counsel.logger.error([
          'uh oh, we can\'t run the dependency report. this is generally',
          'due to having bogus, unused packages installed (corrected via',
          '`npm prune`), or having `npm link`ed packages but not formally',
          'added them to your package.json.'
        ])
        process.exit(1)
      }
    }
    return {
      compile: prd,
      testCompile: dev
    }
  },

  rules: [

    // validate!
    new ScriptRule({
      scriptName: 'validate',
      scriptCommand: 'npm ls && ripcord counsel check',
      scriptCommandVariants: [/npm ls/]
    }),

    // secure!
    new ScriptRule({
      devDependencies: ['nsp'],
      scriptName: 'secure',
      scriptCommand: 'nsp check'
    }),

    // lint!
    new ScriptRule({
      devDependencies: ['standard'],
      scriptName: 'lint',
      scriptCommand: 'standard'
    }),

    // test and coverage!
    new ScriptRule({
      scriptName: 'test',
      scriptCommand: 'nyc --reporter=lcov node test/',
      scriptCommandVariants: ['node test/', 'tape test/**/*.js', 'node test/**/*.js']
    }),
    new ScriptRule({
      devDependencies: ['nyc'],
      scriptName: 'check-coverage',
      scriptCommand: 'nyc check-coverage --lines 90 --functions 90 --branches 90',
      scriptCommandVariants: ['*']
    }),

    // developer docs
    new ScriptRule({
      devDependencies: ['jsdoc', 'minami', 'perish'],
      scriptName: 'docs',
      scriptCommand: 'node scripts/doc.js'
    }),
    new Rule({
      devDependencies: ['gh-pages'] // <== auto deploy docs
    }),
    new CopyRule({
      copyContentRoot: COPY_CONTENT_ROOT,
      copySource: './templates/jsdoc.json',
      copyTarget: './scripts'
    }),
    new CopyRule({
      copyContentRoot: COPY_CONTENT_ROOT,
      copySource: './templates/docs.js',
      copyTarget: './scripts'
    }),

    // tie 'em up!
    new PreCommitRule({
      preCommitTasks: ['validate', 'lint', 'test', 'check-coverage', 'secure']
    })
  ]
}
