import * as path from 'path'
const fs = require('fs')
const PreCommitRule = require('counsel-precommit')
const ScriptRule = require('counsel-script')

module.exports = [
  // tie 'em up!
  // @note: apply first, as rule sniffs for git-root. if missing, fails, so should
  // occur first before waiting for long dependency install rules
  new PreCommitRule({
    name: 'precommit',
    preCommitTasks: ['validate', 'lint', 'test', 'secure']
  }),

  // validate!
  new ScriptRule({
    name: 'validate',
    scriptName: 'validate',
    scriptCommand: 'ripcord counsel check',
    scriptCommandVariants: ['*']
  }),

  // secure!
  new ScriptRule({
    name: 'check-vulnerablities',
    devDependencies: ['nsp'],
    scriptName: 'check-vulnerablities',
    scriptCommand: 'nsp check',
    scriptCommandVariants: ['*']
  }),

  // lint!
  new ScriptRule({
    name: 'lint',
    devDependencies: ['standard'],
    scriptName: 'lint',
    scriptCommand: 'standard',
    scriptCommandVariants: ['*']
  }),

  // test and coverage!
  new ScriptRule({
    name: 'test',
    devDependencies: ['nyc'],
    scriptName: 'test',
    scriptCommand: 'nyc --reporter=lcov node test/',
    scriptCommandVariants: ['*']
  }),
  new ScriptRule({
    name: 'coverage',
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
    name: 'api-docs-generate',
    scriptName: 'docs',
    scriptCommand: 'ripcord docs',
    scriptCommandVariants: ['*']
  }),
  new ScriptRule({
    name: 'api-docs-publish',
    scriptName: 'docs-publish',
    scriptCommand: 'ripcord docs --publish',
    scriptCommandVariants: ['*']
  }),

  // licenses
  new ScriptRule({
    name: 'check-licenses',
    scriptName: 'check-licenses',
    scriptCommand: 'ripcord licenses check',
    scriptCommandVariants: ['*']
  })
]
