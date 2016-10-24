'use strict'

const path = require('path')
const fs = require('fs')
const PreCommitRule = require('counsel-precommit')
const ScriptRule = require('counsel-script')
const CopyRule = require('counsel-copy')

const COPY_CONTENT_ROOT = path.resolve(__dirname, '..')

module.exports = [
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
]
