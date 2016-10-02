'use strict'

const counsel = require('counsel')
const ScriptRule = require('counsel-script')
const CopyRule = require('counsel-copy')
const PreCommitRule = require('counsel-precommit')
const pkg = require('../package.json')
const cp = require('child_process')

counsel.configKey = pkg.name

module.exports = {
  _counsel: counsel,
  _projectRoot: counsel.project.findProjectRoot(),

  /**
   * apply or check ripcord's counsel rules in project.
   * @param {string} action
   * @param {Commander} opts
   * @returns {Promise}
   */
  counsel(action, opts) {
    if (action === 'apply') {
      return counsel.apply(this.rules)
    } else if (action === 'check') {
      return counsel.logger.error('check not yet implemented')
    }
    let errMsg = `"${action}" not a valid ripcord counsel argument`
    if (!action) errMsg = 'ripcord counsel requires an argument'
    counsel.logger.error(errMsg)
    process.exit(1)
  },

  /**
   * generate tw project dependency report
   * @param {null} action
   * @param {Commander} opts
   */
  report(action, opts) {
    let prd
    let dev
    try {
      prd = JSON.parse(cp.execSync('npm ls --prod --json', { cwd: this._projectRoot }).toString())
      dev = JSON.parse(cp.execSync('npm ls --prod --json', { cwd: this._projectRoot }).toString())
    } catch (err) {
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
    process.stdout.write(JSON.stringify({
      compile: prd,
      testCompile: dev
    }, null, 2))
  },

  rules: [
    {
      scriptName: 'validate',
      scriptCommand: 'npm ls'
    },
    {
      devDependencies: ['standard'],
      scriptName: 'lint',
      scriptCommand: 'standard'
    },
    {
      scriptName: 'test',
      scriptCommand: 'node test/',
      scriptCommandVariants: ['tape test/**/*.js', 'node test/**/*.js']
    },
    {
      devDependencies: ['nyc'],
      scriptName: 'coverage',
      scriptCommand: 'nyc check-coverage --lines 90 --functions 90 --branches 90',
      scriptCommandVariants: ['*']
    }
  ].map(s => new ScriptRule(s)).concat([
    new PreCommitRule({
      preCommitTasks: ['validate', 'lint', 'test', 'coverage']
    }),

    // docs
    new ScriptRule({
      devDependencies: 'jsdoc',
      scriptName: 'docs',
      scriptCommand: 'jsdoc -c .jsdoc.json -R README.md -d docs src/',
    }),
    new CopyRule({
      copySource: './templates/.jsdoc.json',
      copyTarget: './'
    })
  ])
}
