"use strict";
const path = require('path');
const fs = require('fs');
const PreCommitRule = require('counsel-precommit');
const ScriptRule = require('counsel-script');
module.exports = [
    // tie 'em up!
    // @note: apply first, as rule sniffs for git-root. if missing, fails, so should
    // occur first before waiting for long dependency install rules
    new PreCommitRule({
        name: 'precommit-script',
        preCommitTasks: ['validate', 'lint', 'test', 'check-coverage', 'check-licenses', 'secure', 'docs']
    }),
    // validate!
    new ScriptRule({
        name: 'validate-script',
        scriptName: 'validate',
        scriptCommand: 'npm ls && ripcord counsel check',
        scriptCommandVariants: ['*']
    }),
    // secure!
    new ScriptRule({
        name: 'security-check-script',
        devDependencies: ['nsp'],
        scriptName: 'secure',
        scriptCommand: 'nsp check',
        scriptCommandVariants: ['*']
    }),
    // lint!
    new ScriptRule({
        name: 'lint-script',
        devDependencies: ['standard'],
        scriptName: 'lint',
        scriptCommand: 'standard',
        scriptCommandVariants: ['*']
    }),
    // test and coverage!
    new ScriptRule({
        name: 'test-script',
        devDependencies: ['nyc'],
        scriptName: 'test',
        scriptCommand: 'nyc --reporter=lcov node test/',
        scriptCommandVariants: ['*']
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
            apply() { },
            check(counsel) {
                const readmeFilename = path.resolve(counsel.targetProjectRoot, 'README.md');
                if (!fs.existsSync(readmeFilename)) {
                    throw new Error(`README.md not found at: ${readmeFilename}`);
                }
            }
        };
    })(),
    // developer docs
    new ScriptRule({
        name: 'api-docs-generate-script',
        scriptName: 'docs',
        scriptCommand: 'ripcord docs',
        scriptCommandVariants: ['*']
    }),
    new ScriptRule({
        name: 'api-docs-publish-script',
        scriptName: 'docs-publish',
        scriptCommand: 'ripcord docs --publish',
        scriptCommandVariants: ['*']
    }),
    new ScriptRule({
        name: 'postpublish-api-docs-script',
        scriptName: 'postpublish',
        scriptCommand: 'npm run docs-publish',
        scriptCommandVariants: ['*']
    }),
    // safe publishing
    new ScriptRule({
        name: 'preversion-script',
        scriptName: 'preversion',
        scriptCommand: 'git checkout master && git pull',
        scriptCommandVariants: ['*']
    }),
    new ScriptRule({
        name: 'publish-patch-script',
        scriptName: 'publish-patch',
        scriptCommand: 'npm run preversion && npm version patch && git push origin master --tags && npm publish',
        scriptCommandVariants: ['*']
    }),
    new ScriptRule({
        name: 'publish-minor-script',
        scriptName: 'publish-minor',
        scriptCommand: 'npm run preversion && npm version minor && git push origin master --tags && npm publish',
        scriptCommandVariants: ['*']
    }),
    new ScriptRule({
        name: 'publish-major-script',
        scriptName: 'publish-major',
        scriptCommand: 'npm run preversion && npm version major && git push origin master --tags && npm publish',
        scriptCommandVariants: ['*']
    }),
    // licenses
    new ScriptRule({
        name: 'verify-licenses-script',
        scriptName: 'check-licenses',
        scriptCommand: 'ripcord licenses check',
        scriptCommandVariants: ['*']
    })
];
//# sourceMappingURL=rules.js.map