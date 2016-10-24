/**
 * @module ripcord
 */

'use strict'

require('perish')
const counsel = require('counsel')
const ScriptRule = require('counsel-script')
const CopyRule = require('counsel-copy')
const pkg = require('../package.json')
const resolveDeps = require('snyk-resolve-deps')
const path = require('path')
const fs = require('fs')
const PreCommitRule = require('counsel-precommit')
const logger = require('./logger')

// const kebab = require('lodash.kebabcase')
// const FilenameRule = require('counsel-filename-format')

// counsel init
counsel.configKey = pkg.name
counsel.setTargetPackageMeta()

const COPY_CONTENT_ROOT = path.resolve(__dirname, '..')

module.exports = {
  /**
   * @property {Counsel} counsel counsel instance
   */
  _counsel: counsel,

  /**
   * @property {string} projectRoot full path of target project
   */
  projectRoot: counsel.project.findProjectRoot(),

  logger: logger,

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
    const prd = {}
    const dev = {}
    const rptPkg = counsel.targetProjectPackageJson
    /* istanbul ignore next */
    if (!rptPkg.name || !rptPkg.version) {
      throw new ReferenceError('package name and version required in package.json')
    }
    /* istanbul ignore next */
    if (!rptPkg.license) throw new ReferenceError('package requires a license in package.json')
    return resolveDeps(this.projectRoot, { dev: true, extraFields: ['tripwireId'] })
    .then(tree => {
      const deps = tree.dependencies // .dependencies _has_ deps and devDeps
      for (let pkg in deps) {
        if (deps[pkg].depType.match(/prod/)) prd[pkg] = deps[pkg]
        else dev[pkg] = deps[pkg]
      }
      this._simplifyDepStructure(prd)
      this._simplifyDepStructure(dev)
      return {
        package: {
          name: rptPkg.name,
          version: rptPkg.version,
          author: rptPkg.author,
          license: rptPkg.license
        },
        configurations: {
          compile: prd,
          testCompile: dev
        }
      }
    })
  },

  /**
   * @property {Rule[]} set of rules to apply/check
   */
  rules: [

    // validate!
    new ScriptRule({
      name: 'validate-script',
      scriptName: 'validate',
      scriptCommand: 'npm ls && ripcord counsel check',
      scriptCommandVariants: [/nsm ls/]
    }),

    // secure!
    new ScriptRule({
      name: 'security-check-script',
      devDependencies: ['nsp'],
      scriptName: 'secure',
      scriptCommand: 'nsp check'
    }),

    // lint!
    new ScriptRule({
      name: 'lint-script',
      devDependencies: ['standard'],
      scriptName: 'lint',
      scriptCommand: 'standard'
    }),

    // test and coverage!
    new ScriptRule({
      name: 'test-script',
      devDependencies: ['nyc'],
      scriptName: 'test',
      scriptCommand: 'nyc --reporter=lcov node test/',
      scriptCommandVariants: ['node test/', 'tape test/**/*.js', 'node test/**/*.js', /react-scripts/]
    }),
    new ScriptRule({
      name: 'coverage-script',
      devDependencies: ['nyc'],
      scriptName: 'check-coverage',
      scriptCommand: 'nyc check-coverage --lines 90 --functions 90 --branches 90',
      scriptCommandVariants: ['*']
    }),

    // readme
    (function () {
      /* istanbul ignore next */
      return {
        name: 'enforce-readme',
        apply () {},
        check (counsel) {
          const readmeFilename = path.resolve(counsel.targetProjectRoot, 'README.md')
          if (!fs.existsSync(readmeFilename)) {
            throw new Error(`README.md not found at: ${readmeFilename}`)
          }
        }
      }
    })(),

    // developer docs
    new ScriptRule({
      name: 'api-docs-script',
      devDependencies: ['jsdoc', 'minami', 'perish'],
      scriptName: 'docs',
      scriptCommand: 'node scripts/docs.js'
    }),
    new ScriptRule({
      name: 'postpublish-api-docs-script',
      devDependencies: ['gh-pages'], // <== auto deploy docs
      scriptName: 'postpublish',
      scriptCommand: 'npm run docs',
      scriptCommandVariants: ['*']
    }),
    new CopyRule({
      name: 'api-doc-rules-copy',
      copyContentRoot: COPY_CONTENT_ROOT,
      copySource: './templates/jsdoc.json',
      copyTarget: './scripts'
    }),
    new CopyRule({
      name: 'api-doc-script-copy',
      copyContentRoot: COPY_CONTENT_ROOT,
      copySource: './templates/docs.js',
      copyTarget: './scripts'
    }),

    // safe publishing
    new ScriptRule({
      name: 'preversion-script',
      scriptName: 'preversion',
      scriptCommand: 'git checkout master && git pull && npm run validate'
    }),
    new ScriptRule({
      name: 'publish-patch-script',
      scriptName: 'publish-patch',
      scriptCommand: 'npm run preversion && npm version patch && git push origin master --tags && npm publish'
    }),
    new ScriptRule({
      name: 'publish-minor-script',
      scriptName: 'publish-minor',
      scriptCommand: 'npm run preversion && npm version minor && git push origin master --tags && npm publish'
    }),
    new ScriptRule({
      name: 'publish-major-script',
      scriptName: 'publish-major',
      scriptCommand: 'npm run preversion && npm version major && git push origin master --tags && npm publish'
    }),

    // license
    new CopyRule({
      name: 'license-check-script-copy',
      copyContentRoot: COPY_CONTENT_ROOT,
      copySource: './templates/check-licenses.js',
      copyTarget: './scripts'
    }),
    new ScriptRule({
      name: 'verify-licenses-script',
      devDependencies: ['license-checker'],
      scriptName: 'check-licenses',
      scriptCommand: 'node scripts/check-licenses.js'
    }),

    // // filenames! kebab 'em
    // new FilenameRule({
    //   name: 'kebab case it!',
    //   fileFormatExtensions: 'js',
    //   fileFormatFunction: kebab
    // }),

    // tie 'em up!
    new PreCommitRule({
      name: 'precommit-script',
      preCommitTasks: ['validate', 'lint', 'test', 'check-coverage', 'check-licenses', 'secure']
    })
  ],

  /**
   * mutates the snyk dep report in place to include only a small subset of keys for
   * noise reduction and ease of parsing for people interested in the report.
   * @private
   * @param {object} depSet snyk dep set
   * @returns {undefined}
   */
  _simplifyDepStructure (depSet) {
    for (var pkgName in depSet) {
      var pkg = depSet[pkgName]
      pkg = depSet[pkgName] = {
        'tripwireId': pkg.tripwireId,
        'requestedVersion': pkg.dep,
        'version': pkg.version,
        'dependencies': pkg.dependencies,
        'license': pkg.license
      }
      if (Object.keys(pkg.dependencies).length) this._simplifyDepStructure(pkg.dependencies)
      else delete pkg.dependencies
    }
  }
}
